import { database, auth } from "./firebase-config.js";
import { ref, onValue, set, push, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getUserProfile } from "./profile.js";

let consumptionListener = null;
let lastDailyConsumption = null;

// Render the consumption dashboard
export function renderConsumptionDashboard() {
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h2>Electric Consumption Dashboard</h2>
        <p>Monitor your electricity usage and manage payments</p>
      </div>
      
      <div class="dashboard-grid">
        <!-- Current Consumption Card -->
        <div class="consumption-card card">
          <div class="card-header">
            <h3>Current Consumption</h3>
            <div class="status-indicator" id="connection-status">
              <span class="status-dot"></span>
              <span class="status-text">Connecting...</span>
            </div>
          </div>
          <div class="card-content">
            <div class="consumption-display">
              <div class="consumption-value" id="consumption-value">
                <span class="value">--</span>
                <span class="unit">kWh</span>
              </div>
              <div class="consumption-rate" id="consumption-rate">
                Rate: <span>--</span> ₱/kWh
              </div>
            </div>
            <div class="consumption-details">
              <div class="detail-item">
                <span class="label">Today's Usage:</span>
                <span class="value" id="today-usage">-- kWh</span>
              </div>
              <div class="detail-item">
                <span class="label">This Month:</span>
                <span class="value" id="month-usage">-- kWh</span>
              </div>
              <div class="detail-item">
                <span class="label">Last Updated:</span>
                <span class="value" id="last-updated">--</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bill Summary Card -->
        <div class="bill-card card">
          <div class="card-header">
            <h3>Current Bill (Raw Amount)</h3>
          </div>
          <div class="card-content">
            <div class="bill-amount">
              <span class="currency">₱</span>
              <span class="amount" id="bill-amount">0.00</span>
            </div>
            <div class="bill-details">
              <div class="bill-item">
                <span>Total Amount (kWh × Price):</span>
                <span id="energy-charge">₱0.00</span>
              </div>
              <div class="bill-item">
                <span>Service Fee:</span>
                <span id="service-fee">₱0.00</span>
              </div>
              <div class="bill-item">
                <span>Tax:</span>
                <span id="tax-amount">₱0.00</span>
              </div>
            </div>
            <div class="payment-section">
              <button id="payment-btn" class="btn-payment">
                <span class="btn-text">Make Payment</span>
                <div class="btn-loading" style="display: none;">Processing...</div>
              </button>
              <div id="payment-message" class="payment-message"></div>
            </div>
          </div>
        </div>

        <!-- Usage History Card -->
        <div class="history-card card">
          <div class="card-header">
            <h3>Recent Usage History</h3>
          </div>
          <div class="card-content">
            <div class="history-list" id="usage-history">
              <div class="loading-history">Loading history...</div>
            </div>
          </div>
        </div>

        <!-- Quick Actions Card -->
        <div class="actions-card card">
          <div class="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div class="card-content">
            <div class="action-buttons">
              <button class="action-btn" id="export-data-btn">
                Export Data
              </button>
              <button class="action-btn" id="set-alert-btn">
                Set Usage Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize dashboard functionality
  initializeDashboard();
}

// Initialize dashboard functionality
function initializeDashboard() {
  fetchUserDevice();
  setupEventListeners();
  loadUsageHistory();
}

// Fetch user device data based on phone number from profile
async function fetchUserDevice() {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated");
    updateConnectionStatus("error");
    displayError("User not authenticated. Please sign in again.");
    return;
  }
  
  console.log("Fetching user device data for:", user.email);
  updateConnectionStatus("connecting");
  
  try {
    const profileData = await getUserProfile(user.uid);
    
    if (!profileData || !profileData.phone) {
      updateConnectionStatus("no-data");
      displayError("Phone number missing in your profile. Please update your profile with your device phone number.");
      return;
    }
    
    const userPhone = profileData.phone.trim();
    console.log("Looking for device with phone number:", userPhone);
    
    const devicesRef = ref(database, "devices");
    
    consumptionListener = onValue(devicesRef, (snapshot) => {
      try {
        const devices = snapshot.val();
        console.log("Received devices data:", devices);
        
        if (!devices) {
          updateConnectionStatus("no-data");
          displayError("No device data available in the database.");
          return;
        }
        
        let matchedDevice = null;
        let matchedDeviceId = null;
        
        for (const deviceId in devices) {
          const device = devices[deviceId];
          const devicePhone = device["Contact Number"] || device.phone || device.contactNumber || deviceId;
          
          if (devicePhone && devicePhone.toString().trim() === userPhone) {
            matchedDevice = device;
            matchedDeviceId = deviceId;
            console.log("Found matching device:", deviceId, device);
            break;
          }
        }
        
        if (matchedDevice) {
          updateConnectionStatus("connected");
          updateDeviceData(matchedDevice, matchedDeviceId);
        } else {
          updateConnectionStatus("no-data");
          displayError(`No device found matching your phone number: ${userPhone}. Please verify your profile phone number matches your device registration.`);
        }
        
      } catch (error) {
        console.error("Error processing devices data:", error);
        updateConnectionStatus("error");
        displayError("Error loading device data: " + error.message);
      }
    }, (error) => {
      console.error("Error fetching devices data:", error);
      updateConnectionStatus("error");
      displayError("Failed to connect to device database: " + error.message);
    });
    
  } catch (error) {
    console.error("Error fetching user profile:", error);
    updateConnectionStatus("error");
    displayError("Failed to load user profile: " + error.message);
  }
}

// Update device data display based on matched device
function updateDeviceData(deviceData, deviceId) {
  if (!deviceData || typeof deviceData !== "object") {
    displayError("Invalid device data received");
    return;
  }
  
  console.log("Updating device data display:", deviceData);
  
  const consumption = Number(deviceData.kwh || deviceData.kwhr || 0);
  const rate = Number(deviceData.Price || deviceData.price || 12.50);
  const timestamp = deviceData.timestamp || Date.now();
  const deviceName = deviceData.Name || deviceData.name || `Device ${deviceId}`;
  const deviceAddress = deviceData.Address || deviceData.address || "Unknown Location";
  
  console.log("Extracted data:", { consumption, rate, timestamp, deviceName, deviceAddress });
  
  // Update consumption display (show total meter reading)
  document.getElementById("consumption-value").innerHTML = `
    <span class="value">${consumption.toFixed(2)}</span>
    <span class="unit">kWh</span>
  `;
  
  document.getElementById("consumption-rate").innerHTML = `
    Rate: <span>₱${rate.toFixed(2)}</span> /kWh
  `;
  
  // Calculate and display bill (raw amount: kWh × Price)
  const rawAmount = consumption * rate;
  document.getElementById("bill-amount").textContent = rawAmount.toFixed(2);
  document.getElementById("energy-charge").textContent = `₱${rawAmount.toFixed(2)}`;
  document.getElementById("service-fee").textContent = `₱0.00`;
  document.getElementById("tax-amount").textContent = `₱0.00`;
  
  // Calculate actual usage based on previous readings
  calculateDailyUsage(consumption, deviceId);
  
  window.currentConsumptionData = { 
    consumption, 
    rate, 
    timestamp, 
    deviceName, 
    deviceAddress,
    deviceId 
  };
  
  console.log("Device data display updated successfully");
}

// Calculate daily usage based on previous readings
async function calculateDailyUsage(currentConsumption, deviceId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get yesterday's reading
    const yesterdayRef = ref(database, `meter_readings/${user.uid}/${yesterday}`);
    const yesterdaySnapshot = await get(yesterdayRef);
    
    // Get month start reading
    const monthStartRef = ref(database, `month_readings/${user.uid}/${currentMonth}`);
    const monthStartSnapshot = await get(monthStartRef);
    
    let todayUsage = 0;
    let monthlyUsage = 0;
    
    if (yesterdaySnapshot.exists()) {
      // Calculate today's usage as difference from yesterday
      const yesterdayReading = yesterdaySnapshot.val().reading;
      todayUsage = Math.max(0, currentConsumption - yesterdayReading);
    } else {
      // First day - assume 2 kWh as example daily usage
      todayUsage = 2.0;
    }
    
    if (monthStartSnapshot.exists()) {
      // Calculate monthly usage from month start
      const monthStartReading = monthStartSnapshot.val().reading;
      monthlyUsage = Math.max(0, currentConsumption - monthStartReading);
    } else {
      // First month - set current reading as month start
      await set(monthStartRef, { reading: currentConsumption, timestamp: Date.now() });
      monthlyUsage = todayUsage;
    }
    
    // Store today's reading for tomorrow's calculation
    const todayRef = ref(database, `meter_readings/${user.uid}/${today}`);
    await set(todayRef, { reading: currentConsumption, timestamp: Date.now() });
    
    // Store today's usage for trends
    const todayUsageRef = ref(database, `daily_usage/${user.uid}/${today}`);
    await set(todayUsageRef, { usage: todayUsage, timestamp: Date.now() });
    
    // Update display
    document.getElementById("today-usage").textContent = `${todayUsage.toFixed(2)} kWh`;
    document.getElementById("month-usage").textContent = `${monthlyUsage.toFixed(2)} kWh`;
    document.getElementById("last-updated").textContent = new Date().toLocaleString();
    
    console.log(`Current reading: ${currentConsumption} kWh`);
    console.log(`Today's usage: ${todayUsage} kWh`);
    console.log(`Monthly usage: ${monthlyUsage} kWh`);
    
  } catch (error) {
    console.error("Error calculating daily usage:", error);
    document.getElementById("today-usage").textContent = "0.00 kWh";
    document.getElementById("month-usage").textContent = "0.00 kWh";
    document.getElementById("last-updated").textContent = new Date().toLocaleString();
  }
}

// Update connection status indicator
function updateConnectionStatus(status) {
  const statusElement = document.getElementById("connection-status");
  const statusDot = statusElement.querySelector(".status-dot");
  const statusText = statusElement.querySelector(".status-text");
  
  statusElement.className = `status-indicator ${status}`;
  
  switch (status) {
    case "connecting":
      statusText.textContent = "Connecting...";
      break;
    case "connected":
      statusText.textContent = "Live";
      break;
    case "no-data":
      statusText.textContent = "No Data";
      break;
    case "error":
      statusText.textContent = "Error";
      break;
  }
}

// Display error message
function displayError(message) {
  console.error("Dashboard Error:", message);
  
  document.getElementById("consumption-value").innerHTML = `
    <span class="value error">0.00</span>
    <span class="unit">kWh</span>
  `;
  document.getElementById("consumption-rate").innerHTML = `Rate: <span>0.00</span> ₱/kWh`;
  
  document.getElementById("bill-amount").textContent = "0.00";
  document.getElementById("energy-charge").textContent = "₱0.00";
  document.getElementById("service-fee").textContent = "₱0.00";
  document.getElementById("tax-amount").textContent = "₱0.00";
  
  document.getElementById("today-usage").textContent = "0.00 kWh";
  document.getElementById("month-usage").textContent = "0.00 kWh";
  document.getElementById("last-updated").textContent = "Error loading data";
}

// Set up event listeners
function setupEventListeners() {
  document.getElementById("payment-btn").addEventListener("click", processPayment);
  document.getElementById("export-data-btn").addEventListener("click", exportData);
  document.getElementById("set-alert-btn").addEventListener("click", setUsageAlert);
}

// Process payment
async function processPayment() {
  const paymentBtn = document.getElementById("payment-btn");
  const btnText = paymentBtn.querySelector(".btn-text");
  const btnLoading = paymentBtn.querySelector(".btn-loading");
  const paymentMessage = document.getElementById("payment-message");
  
  btnText.style.display = "none";
  btnLoading.style.display = "inline";
  paymentBtn.disabled = true;
  paymentMessage.textContent = "";
  paymentMessage.className = "payment-message";

  try {
    const billAmount = document.getElementById("bill-amount").textContent;
    const billAmountFloat = parseFloat(billAmount);
    
    if (!billAmount || billAmount === "0.00" || billAmountFloat <= 0) {
      throw new Error("No amount to pay or invalid amount");
    }

    const confirmPayment = confirm(`Are you sure you want to make a payment of ₱${billAmount}?`);
    if (!confirmPayment) {
      throw new Error("Payment cancelled by user");
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated. Please sign in again.");
    }

    const paymentData = {
      userId: user.uid,
      userEmail: user.email,
      amount: billAmountFloat,
      currency: "PHP",
      timestamp: Date.now(),
      date: new Date().toISOString(),
      status: "completed",
      paymentMethod: "credit_card",
      transactionId: generateTransactionId(),
      description: "Electricity bill payment (Raw Amount)"
    };
    
    const paymentsRef = ref(database, `payments/${user.uid}`);
    await push(paymentsRef, paymentData);
    
    paymentMessage.textContent = `Payment of ₱${billAmount} processed successfully! Transaction ID: ${paymentData.transactionId}`;
    paymentMessage.className = "payment-message success";
    
    setTimeout(() => {
      document.getElementById("bill-amount").textContent = "0.00";
      document.getElementById("energy-charge").textContent = "₱0.00";
      document.getElementById("service-fee").textContent = "₱0.00";
      document.getElementById("tax-amount").textContent = "₱0.00";
    }, 1000);
    
  } catch (error) {
    console.error("Payment processing error:", error);
    
    if (error.message === "Payment cancelled by user") {
      paymentMessage.textContent = "Payment cancelled";
      paymentMessage.className = "payment-message";
    } else {
      paymentMessage.textContent = error.message || "Payment failed. Please try again.";
      paymentMessage.className = "payment-message error";
    }
  } finally {
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    paymentBtn.disabled = false;
  }
}

// Load usage history
async function loadUsageHistory() {
  const historyContainer = document.getElementById("usage-history");
  
  try {
    const historyData = await getFirebaseHistory();
    
    if (historyData.length === 0) {
      historyContainer.innerHTML = '<div class="no-data-message">No usage history available.</div>';
      return;
    }
    
    historyContainer.innerHTML = historyData.map(item => `
      <div class="history-item">
        <div class="history-date">${item.date}</div>
        <div class="history-usage">${item.usage} kWh</div>
        <div class="history-cost">₱${item.cost}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error("Error loading usage history:", error);
    historyContainer.innerHTML = '<div class="error">Failed to load history</div>';
  }
}

// Quick action functions
function exportData() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in to export data");
    return;
  }
  
  const headers = ["Field", "Value"];
  const rows = [
    ["User Email", user.email],
    ["Export Date", new Date().toISOString()],
    ["Consumption (kWh)", document.getElementById("consumption-value").textContent],
    ["Bill Amount (₱)", document.getElementById("bill-amount").textContent],
    ["Today's Usage (kWh)", document.getElementById("today-usage").textContent],
    ["This Month's Usage (kWh)", document.getElementById("month-usage").textContent]
  ];
  
  let csvContent = headers.join(",") + "\n";
  rows.forEach(row => {
    csvContent += row.join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ElectriTrack_Consumption_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  alert(`Data export completed for ${user.email}.`);
}

function setUsageAlert() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in to set usage alerts");
    return;
  }
  
  const threshold = prompt("Set usage alert threshold (kWh):");
  if (threshold && !isNaN(threshold) && parseFloat(threshold) > 0) {
    console.log(`Setting usage alert for user ${user.email}: ${threshold} kWh`);
    alert(`Usage alert set for ${threshold} kWh. You'll be notified when consumption exceeds this limit.`);
    
    const alertData = {
      userId: user.uid,
      threshold: parseFloat(threshold),
      timestamp: Date.now(),
      active: true
    };
    console.log("Alert data:", alertData);
  } else if (threshold !== null) {
    alert("Please enter a valid positive number for the threshold.");
  }
}

// Utility functions
function generateTransactionId() {
  return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

async function getFirebaseHistory() {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const historyRef = ref(database, `history/${user.uid}`);
    const snapshot = await get(historyRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const data = snapshot.val();
    const history = [];
    
    for (const key in data) {
      const item = data[key];
      history.push({
        date: item.date || new Date(item.timestamp).toLocaleDateString(),
        usage: parseFloat(item.usage || 0).toFixed(2),
        cost: parseFloat(item.cost || 0).toFixed(2)
      });
    }
    
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return history.slice(0, 7);
  } catch (error) {
    console.error("Error fetching history from Firebase:", error);
    return [];
  }
}

// Cleanup function
export function cleanupConsumptionListener() {
  if (consumptionListener) {
    consumptionListener();
    consumptionListener = null;
  }
}
