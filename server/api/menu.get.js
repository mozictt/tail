// server/api/menu.get.js
export default defineEventHandler(() => {
  return [
    { 
      name: "Dashboard", 
      icon: "Home", 
      path: "/", 
      description: "Overview and stats of your application" 
    },
    { 
      name: "Users", 
      icon: "Users", 
      path: "/users",
      description: "Manage application users",
      children: [
        { name: "List Users", path: "/users/list", description: "View all users" },
        { name: "Create User", path: "/users/create", description: "Add new user" }
      ]
    },
    { 
      name: "Settings", 
      icon: "Settings", 
      path: "/settings",
      description: "Configure system preferences",
      children: [
        { name: "Profile", path: "/settings/profile", description: "Edit your profile" },
        { name: "Security", path: "/settings/security", description: "Update security settings" }
      ]
    },
    { 
      name: "Reports", 
      icon: "BarChart3", 
      path: "/reports", 
      description: "View detailed reports" 
    }
  ];
});
