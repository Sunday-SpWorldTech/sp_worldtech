const courses = [
  {
    "id": "html-foundations",
    "icon": "🌐",
    "title": "HTML Foundations",
    "level": "Starter",
    "lessons": 12,
    "skill": "Web structure and semantic markup",
    "page": "academy-html-foundations.html",
    "topics": [
      "Semantic tags",
      "Forms and inputs",
      "Tables and media",
      "Accessibility basics",
      "Portfolio structure"
    ]
  },
  {
    "id": "html",
    "icon": "🧱",
    "title": "HTML Professional",
    "level": "Starter",
    "lessons": 12,
    "skill": "Production HTML for landing pages and dashboards",
    "page": "academy-html.html",
    "topics": [
      "Page structure",
      "SEO meta tags",
      "Forms",
      "Dashboard markup",
      "Deployment checklist"
    ]
  },
  {
    "id": "css-professional-ui",
    "icon": "🎨",
    "title": "CSS Professional UI",
    "level": "Starter",
    "lessons": 14,
    "skill": "Responsive design and modern layouts",
    "page": "academy-css-professional-ui.html",
    "topics": [
      "Box model",
      "Flexbox",
      "Grid",
      "Responsive components",
      "Professional UI polish"
    ]
  },
  {
    "id": "css",
    "icon": "🖌️",
    "title": "CSS Styling",
    "level": "Starter",
    "lessons": 14,
    "skill": "Clean styling, colors, spacing and mobile design",
    "page": "academy-css.html",
    "topics": [
      "Selectors",
      "Typography",
      "Colors",
      "Layouts",
      "Mobile styles"
    ]
  },
  {
    "id": "javascript-core",
    "icon": "⚡",
    "title": "JavaScript Core",
    "level": "Starter",
    "lessons": 16,
    "skill": "Interactive web behavior and logic",
    "page": "academy-javascript-core.html",
    "topics": [
      "Variables",
      "Functions",
      "DOM",
      "Fetch API",
      "Error handling"
    ]
  },
  {
    "id": "javascript",
    "icon": "✨",
    "title": "JavaScript Professional",
    "level": "Starter",
    "lessons": 16,
    "skill": "Frontend logic for real web apps",
    "page": "academy-javascript.html",
    "topics": [
      "Events",
      "Forms",
      "API requests",
      "Local storage",
      "Dashboard actions"
    ]
  },
  {
    "id": "git-github",
    "icon": "🧭",
    "title": "Git & GitHub",
    "level": "Starter",
    "lessons": 10,
    "skill": "Version control and deployment workflow",
    "page": "academy-git-github.html",
    "topics": [
      "Git basics",
      "Branches",
      "Commits",
      "GitHub repo",
      "Render deploy"
    ]
  },
  {
    "id": "react-frontend",
    "icon": "⚛️",
    "title": "React Frontend",
    "level": "Professional",
    "lessons": 18,
    "skill": "Reusable components and dashboards",
    "page": "academy-react.html",
    "topics": [
      "Components",
      "Props",
      "State",
      "Forms",
      "API dashboards"
    ]
  },
  {
    "id": "node-express",
    "icon": "🟢",
    "title": "Node.js & Express API",
    "level": "Professional",
    "lessons": 18,
    "skill": "Backend APIs and authentication",
    "page": "academy-node-express-api.html",
    "topics": [
      "Node basics",
      "Express routes",
      "Middleware",
      "Auth APIs",
      "Production server"
    ]
  },
  {
    "id": "node",
    "icon": "🟩",
    "title": "Node.js Backend",
    "level": "Professional",
    "lessons": 16,
    "skill": "Server-side JavaScript fundamentals",
    "page": "academy-node.html",
    "topics": [
      "Runtime",
      "Modules",
      "HTTP server",
      "NPM scripts",
      "Backend structure"
    ]
  },
  {
    "id": "express",
    "icon": "🚏",
    "title": "Express API",
    "level": "Professional",
    "lessons": 14,
    "skill": "API routes, controllers and middleware",
    "page": "academy-express.html",
    "topics": [
      "Routes",
      "Controllers",
      "Validation",
      "Errors",
      "API security"
    ]
  },
  {
    "id": "mongodb-backend",
    "icon": "🍃",
    "title": "MongoDB Backend",
    "level": "Professional",
    "lessons": 12,
    "skill": "Database models and production data",
    "page": "academy-mongodb-backend.html",
    "topics": [
      "Collections",
      "Schemas",
      "CRUD",
      "Indexes",
      "Production data"
    ]
  },
  {
    "id": "mongodb",
    "icon": "🍀",
    "title": "MongoDB",
    "level": "Professional",
    "lessons": 12,
    "skill": "NoSQL database skills for dashboards",
    "page": "academy-mongodb.html",
    "topics": [
      "Documents",
      "Queries",
      "Models",
      "Relationships",
      "Atlas setup"
    ]
  },
  {
    "id": "python-builders",
    "icon": "🐍",
    "title": "Python for Builders",
    "level": "Professional",
    "lessons": 14,
    "skill": "Automation and backend fundamentals",
    "page": "academy-python.html",
    "topics": [
      "Syntax",
      "Functions",
      "Files",
      "APIs",
      "Automation"
    ]
  },
  {
    "id": "django",
    "icon": "🏗️",
    "title": "Django Web Apps",
    "level": "Professional",
    "lessons": 15,
    "skill": "Full web applications with Python",
    "page": "academy-django.html",
    "topics": [
      "Project setup",
      "Models",
      "Views",
      "Templates",
      "Auth workflow"
    ]
  },
  {
    "id": "c",
    "icon": "🔧",
    "title": "C Programming",
    "level": "Advanced",
    "lessons": 14,
    "skill": "Low-level programming fundamentals",
    "page": "academy-c.html",
    "topics": [
      "Variables",
      "Pointers",
      "Functions",
      "Memory",
      "Problem solving"
    ]
  },
  {
    "id": "cpp",
    "icon": "🧠",
    "title": "C++ Programming",
    "level": "Advanced",
    "lessons": 16,
    "skill": "Performance and problem solving",
    "page": "academy-cpp.html",
    "topics": [
      "Classes",
      "STL",
      "Algorithms",
      "Files",
      "Projects"
    ]
  },
  {
    "id": "csharp",
    "icon": "💠",
    "title": "C# Programming",
    "level": "Advanced",
    "lessons": 16,
    "skill": "C# fundamentals for software development",
    "page": "academy-csharp.html",
    "topics": [
      "Syntax",
      "OOP",
      "LINQ",
      "Files",
      "Apps"
    ]
  },
  {
    "id": "csharp-dotnet",
    "icon": "🔷",
    "title": "C# & .NET",
    "level": "Advanced",
    "lessons": 16,
    "skill": "Enterprise backend development",
    "page": "academy-csharp-dotnet.html",
    "topics": [
      "ASP.NET",
      "Controllers",
      "Services",
      "Database",
      "Deployment"
    ]
  },
  {
    "id": "dotnet",
    "icon": "🧩",
    "title": ".NET Development",
    "level": "Advanced",
    "lessons": 15,
    "skill": "Modern .NET app workflow",
    "page": "academy-dotnet.html",
    "topics": [
      "CLI",
      "Web API",
      "Dependency injection",
      "Entity Framework",
      "Production"
    ]
  },
  {
    "id": "ai-prompt-engineering",
    "icon": "🤖",
    "title": "AI Prompt Engineering",
    "level": "Professional",
    "lessons": 10,
    "skill": "AI workflows for real products",
    "page": "academy-ai-prompt-engineering.html",
    "topics": [
      "Prompt basics",
      "Business AI",
      "Coding help",
      "Automation",
      "Safety"
    ]
  },
  {
    "id": "premium-school-1",
    "icon": "⭐",
    "title": "Premium School 1",
    "level": "Premium",
    "lessons": 20,
    "skill": "Professional web foundation bundle",
    "page": "academy-premium-school-1.html",
    "topics": [
      "HTML/CSS review",
      "JavaScript practice",
      "GitHub",
      "Portfolio",
      "Final project"
    ]
  },
  {
    "id": "premium-school-2",
    "icon": "🚀",
    "title": "Premium School 2",
    "level": "Premium",
    "lessons": 22,
    "skill": "Full-stack dashboard builder path",
    "page": "academy-premium-school-2.html",
    "topics": [
      "Node/Express",
      "MongoDB",
      "Auth",
      "Payments",
      "Dashboard project"
    ]
  },
  {
    "id": "premium-school-3",
    "icon": "👑",
    "title": "Premium School 3",
    "level": "Premium",
    "lessons": 24,
    "skill": "Advanced production and AI workflow path",
    "page": "academy-premium-school-3.html",
    "topics": [
      "React",
      "AI assistant",
      "API integrations",
      "Security",
      "Deployment"
    ]
  }
];

function getCourse(id) {
  return courses.find(course => course.id === id);
}

module.exports = { courses, getCourse };
