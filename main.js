import { auth } from "./firebase-config.js";
import { loginUser, registerUser, logoutUser } from "./auth.js";
import { renderProfilePage } from "./profile.js";
import { renderConsumptionDashboard, cleanupConsumptionListener } from "./consumption-fixed.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Application state
let currentUser = null;
let currentPage = null;

// Initialize the application
function initializeApp() {
  console.log("Initializing ElectriTrack application...");
  
  // Set up authentication state observer
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateNavigation(user);
    handleAuthStateChange(user);
  });

  // Set up navigation event listeners
  setupNavigation();
  
  // Set up hash change listener for routing
  window.addEventListener("hashchange", handleRouteChange);
  
  // Handle initial route
  handleRouteChange();
}

// Handle authentication state changes
function handleAuthStateChange(user) {
  if (user) {
    console.log("User authenticated:", user.email, "UID:", user.uid);
    console.log("Current hash:", window.location.hash);
    
    // If user is authenticated and on auth page, redirect to dashboard
    if (window.location.hash === "#auth" || window.location.hash === "" || window.location.hash === "#") {
      console.log("Redirecting authenticated user to dashboard");
      window.location.hash = "#dashboard";
    }
  } else {
    console.log("User not authenticated");
    console.log("Current hash:", window.location.hash);
    
    // If user is not authenticated and not on auth page, redirect to auth
    if (window.location.hash !== "#auth") {
      console.log("Redirecting unauthenticated user to auth page");
      window.location.hash = "#auth";
    }
  }
}

// Update navigation based on authentication state
function updateNavigation(user) {
  const navAuth = document.getElementById("nav-auth");
  const navProfile = document.getElementById("nav-profile");
  const navDashboard = document.getElementById("nav-dashboard");
  const navTrends = document.getElementById("nav-trends");

  const sidebarAuth = document.getElementById("sidebar-auth");
  const sidebarProfile = document.getElementById("sidebar-profile");
  const sidebarDashboard = document.getElementById("sidebar-dashboard");
  const sidebarTrends = document.getElementById("sidebar-trends");

  if (user) {
    // User is authenticated
    if (navAuth) {
      navAuth.textContent = "Logout";
      navAuth.href = "#logout";
    }
    if (sidebarAuth) {
      sidebarAuth.textContent = "Logout";
      sidebarAuth.href = "#logout";
    }
    if (navProfile) navProfile.style.display = "inline";
    if (sidebarProfile) sidebarProfile.style.display = "block";
    if (navDashboard) navDashboard.style.display = "inline";
    if (sidebarDashboard) sidebarDashboard.style.display = "block";
    if (navTrends) navTrends.style.display = "inline";
    if (sidebarTrends) sidebarTrends.style.display = "block";

    // Update brand to show user name
    const navBrand = document.querySelector(".nav-brand h1");
    const userName = user.displayName || user.email.split('@')[0];
    navBrand.innerHTML = `⚡ ElectriTrack <span class="user-greeting">- Hello, ${userName}</span>`;
  } else {
    // User is not authenticated
    if (navAuth) {
      navAuth.textContent = "Sign In";
      navAuth.href = "#auth";
    }
    if (sidebarAuth) {
      sidebarAuth.textContent = "Sign In";
      sidebarAuth.href = "#auth";
    }
    if (navProfile) navProfile.style.display = "none";
    if (sidebarProfile) sidebarProfile.style.display = "none";
    if (navDashboard) navDashboard.style.display = "none";
    if (sidebarDashboard) sidebarDashboard.style.display = "none";
    if (navTrends) navTrends.style.display = "none";
    if (sidebarTrends) sidebarTrends.style.display = "none";

    // Reset brand
    document.querySelector(".nav-brand h1").innerHTML = "⚡ ElectriTrack";
  }
}

// Set up navigation event listeners
function setupNavigation() {
  // Hamburger menu toggle
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Dashboard navigation
  const navDashboard = document.getElementById("nav-dashboard");
  const sidebarDashboard = document.getElementById("sidebar-dashboard");
  if (navDashboard) {
    navDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.hash = "#dashboard";
      } else {
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }
  if (sidebarDashboard) {
    sidebarDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.hash = "#dashboard";
      } else {
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }

  // Profile navigation
  const navProfile = document.getElementById("nav-profile");
  const sidebarProfile = document.getElementById("sidebar-profile");
  if (navProfile) {
    navProfile.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.hash = "#profile";
      } else {
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }
  if (sidebarProfile) {
    sidebarProfile.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.hash = "#profile";
      } else {
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }

  // Trends navigation
  const navTrends = document.getElementById("nav-trends");
  const sidebarTrends = document.getElementById("sidebar-trends");
  if (navTrends) {
    navTrends.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.hash = "#trends";
      } else {
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }
  if (sidebarTrends) {
    sidebarTrends.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentUser) {
        window.location.hash = "#trends";
      } else {
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }

  // Auth/Logout navigation
  const navAuth = document.getElementById("nav-auth");
  const sidebarAuth = document.getElementById("sidebar-auth");
  if (navAuth) {
    navAuth.addEventListener("click", async (e) => {
      e.preventDefault();
      if (currentUser) {
        // Logout
        try {
          await logoutUser();
          window.location.hash = "#auth";
        } catch (error) {
          console.error("Logout failed:", error);
          alert("Failed to logout. Please try again.");
        }
      } else {
        // Go to auth page
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }
  if (sidebarAuth) {
    sidebarAuth.addEventListener("click", async (e) => {
      e.preventDefault();
      if (currentUser) {
        // Logout
        try {
          await logoutUser();
          window.location.hash = "#auth";
        } catch (error) {
          console.error("Logout failed:", error);
          alert("Failed to logout. Please try again.");
        }
      } else {
        // Go to auth page
        window.location.hash = "#auth";
      }
      closeSidebar();
    });
  }
}

// Function to close sidebar
function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.remove("active");
  }
}

// Handle route changes
function handleRouteChange() {
  const hash = window.location.hash || "#dashboard";
  console.log("Route change to:", hash, "Current user:", currentUser ? currentUser.email : "none");
  
  // Clean up previous page resources
  cleanupCurrentPage();
  
  // Route to appropriate page
  switch (hash) {
    case "#dashboard":
      if (currentUser) {
        console.log("Rendering dashboard for authenticated user");
        renderDashboardPage();
      } else {
        console.log("User not authenticated, redirecting to auth");
        window.location.hash = "#auth";
        return; // Prevent further execution
      }
      break;
    case "#profile":
      if (currentUser) {
        console.log("Rendering profile for authenticated user");
        renderProfilePageWrapper();
      } else {
        console.log("User not authenticated, redirecting to auth");
        window.location.hash = "#auth";
        return; // Prevent further execution
      }
      break;
    case "#trends":
      if (currentUser) {
        console.log("Rendering trends for authenticated user");
        renderTrendsPageWrapper();
      } else {
        console.log("User not authenticated, redirecting to auth");
        window.location.hash = "#auth";
        return; // Prevent further execution
      }
      break;
    case "#auth":
      console.log("Rendering auth page");
      renderAuthPage();
      break;
    case "#logout":
      // This is handled by navigation click event
      console.log("Logout route - should be handled by navigation");
      break;
    default:
      console.log("Unknown route, redirecting based on auth state");
      // Default to dashboard or auth based on authentication state
      if (currentUser) {
        window.location.hash = "#dashboard";
      } else {
        window.location.hash = "#auth";
      }
      return; // Prevent further execution
  }
  
  // Update active navigation
  updateActiveNavigation(hash);
}

// Update active navigation styling
function updateActiveNavigation(hash) {
  // Remove active class from all nav links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("active");
  });
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.remove("active");
  });

  // Add active class to current page
  switch (hash) {
    case "#dashboard":
      const navDash = document.getElementById("nav-dashboard");
      const sidebarDash = document.getElementById("sidebar-dashboard");
      if (navDash) navDash.classList.add("active");
      if (sidebarDash) sidebarDash.classList.add("active");
      break;
    case "#profile":
      const navProf = document.getElementById("nav-profile");
      const sidebarProf = document.getElementById("sidebar-profile");
      if (navProf) navProf.classList.add("active");
      if (sidebarProf) sidebarProf.classList.add("active");
      break;
    case "#trends":
      const navTrend = document.getElementById("nav-trends");
      const sidebarTrend = document.getElementById("sidebar-trends");
      if (navTrend) navTrend.classList.add("active");
      if (sidebarTrend) sidebarTrend.classList.add("active");
      break;
    case "#auth":
      const navAuth = document.getElementById("nav-auth");
      const sidebarAuth = document.getElementById("sidebar-auth");
      if (navAuth) navAuth.classList.add("active");
      if (sidebarAuth) sidebarAuth.classList.add("active");
      break;
  }
}

// Render dashboard page
function renderDashboardPage() {
  currentPage = "dashboard";
  renderConsumptionDashboard();
}

// Render profile page wrapper
function renderProfilePageWrapper() {
  currentPage = "profile";
  renderProfilePage();
}

// Render trends page wrapper
function renderTrendsPageWrapper() {
  currentPage = "trends";
  // Import the trends view module and render it
  import("./trends.js").then(module => {
    module.renderTrendsView();
  }).catch(error => {
    console.error("Error loading trends module:", error);
    window.location.hash = "#dashboard";
  });
}

// Render authentication page
function renderAuthPage() {
  currentPage = "auth";
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Welcome to ElectriTrack</h2>
          <p>Monitor your electricity consumption and manage payments</p>
        </div>
        
        <div class="auth-tabs">
          <button class="auth-tab active" id="signin-tab">Sign In</button>
          <button class="auth-tab" id="signup-tab">Sign Up</button>
        </div>
        
        <!-- Sign In Form -->
        <form id="signin-form" class="auth-form">
          <div class="form-group">
            <label for="signin-email">Email Address</label>
            <input type="email" id="signin-email" placeholder="Enter your email" required />
          </div>
          
          <div class="form-group">
            <label for="signin-password">Password</label>
            <input type="password" id="signin-password" placeholder="Enter your password" required />
          </div>
          
          <div id="signin-error" class="error-message"></div>
          
          <button type="submit" class="btn-primary">
            <span class="btn-text">Sign In</span>
            <div class="btn-loading" style="display: none;">Signing in...</div>
          </button>
        </form>
        
        <!-- Sign Up Form -->
        <form id="signup-form" class="auth-form" style="display: none;">
          <div class="form-group">
            <label for="signup-name">Full Name</label>
            <input type="text" id="signup-name" placeholder="Enter your full name" required />
          </div>
          
          <div class="form-group">
            <label for="signup-email">Email Address</label>
            <input type="email" id="signup-email" placeholder="Enter your email" required />
          </div>
          
          <div class="form-group">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" placeholder="Create a password (min 6 characters)" required minlength="6" />
          </div>
          
          <div class="form-group">
            <label for="signup-confirm">Confirm Password</label>
            <input type="password" id="signup-confirm" placeholder="Confirm your password" required />
          </div>
          
          <div id="signup-error" class="error-message"></div>
          
          <button type="submit" class="btn-primary">
            <span class="btn-text">Sign Up</span>
            <div class="btn-loading" style="display: none;">Creating account...</div>
          </button>
        </form>
        
        <div class="auth-footer">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  `;

  // Set up auth form functionality
  setupAuthForms();
}

// Set up authentication forms
function setupAuthForms() {
  // Tab switching
  document.getElementById("signin-tab").addEventListener("click", () => {
    switchAuthTab("signin");
  });
  
  document.getElementById("signup-tab").addEventListener("click", () => {
    switchAuthTab("signup");
  });

  // Sign in form
  document.getElementById("signin-form").addEventListener("submit", handleSignIn);
  
  // Sign up form
  document.getElementById("signup-form").addEventListener("submit", handleSignUp);
}

// Switch between auth tabs
function switchAuthTab(tab) {
  const signinTab = document.getElementById("signin-tab");
  const signupTab = document.getElementById("signup-tab");
  const signinForm = document.getElementById("signin-form");
  const signupForm = document.getElementById("signup-form");
  
  if (tab === "signin") {
    signinTab.classList.add("active");
    signupTab.classList.remove("active");
    signinForm.style.display = "block";
    signupForm.style.display = "none";
  } else {
    signupTab.classList.add("active");
    signinTab.classList.remove("active");
    signupForm.style.display = "block";
    signinForm.style.display = "none";
  }
  
  // Clear error messages
  document.getElementById("signin-error").textContent = "";
  document.getElementById("signup-error").textContent = "";
}

// Handle sign in
async function handleSignIn(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const errorDiv = document.getElementById("signin-error");
  
  // Show loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;
  errorDiv.textContent = "";
  errorDiv.style.display = 'none';

  try {
    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value;
    
    console.log("Attempting sign in for:", email);
    const user = await loginUser(email, password);
    console.log("Sign in successful, user:", user.email);
    
    // Clear form
    document.getElementById("signin-email").value = "";
    document.getElementById("signin-password").value = "";
    
    // Navigation will be handled by auth state change
    
  } catch (error) {
    console.error("Sign in error:", error);
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  } finally {
    // Reset button state
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// Handle sign up
async function handleSignUp(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const errorDiv = document.getElementById("signup-error");
  
  // Show loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;
  errorDiv.textContent = "";
  errorDiv.style.display = 'none';

  try {
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm").value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }
    
    console.log("Attempting sign up for:", email, "with name:", name);
    const user = await registerUser(email, password, name);
    console.log("Sign up successful, user:", user.email);
    
    // Clear form
    document.getElementById("signup-name").value = "";
    document.getElementById("signup-email").value = "";
    document.getElementById("signup-password").value = "";
    document.getElementById("signup-confirm").value = "";
    
    // Navigation will be handled by auth state change
    
  } catch (error) {
    console.error("Sign up error:", error);
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  } finally {
    // Reset button state
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// Clean up current page resources
function cleanupCurrentPage() {
  if (currentPage === "dashboard") {
    cleanupConsumptionListener();
  }
}

// Initialize the application when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for debugging
window.ElectriTrackApp = {
  currentUser: () => currentUser,
  currentPage: () => currentPage,
  auth: auth
};
