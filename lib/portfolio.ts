export const portfolio = {
  personal: {
    name: "Sourav Samanta",
    title: "Full Stack Developer",
    subtitle: "Node.js | Express | MongoDB | React",
    tagline: "I design and build fast, accessible web experiences with modern stacks.",
    experience: "2+ years",
    location: "Bengaluru, Karnataka",
    email: "saifactplanet@gmail.com",
    phone: "+91 99031 49299",
    socialLinks: {
      github: "https://github.com/sou842",
      linkedin: "https://www.linkedin.com/in/codebysourav/"
    },
    resumeUrl: "https://drive.google.com/file/d/146f0cpJf8NSpoJd16muhMbNFDU5VMOPo/view?usp=sharing",
    portfolioUrl: "https://sou842.github.io/"
  },

  about: {
    bio: "Full Stack Developer with 2+ years of experience building innovative, efficient web applications across front-end and back-end. Passionate about modern frameworks, scalable architectures, and delivering high-quality solutions that drive impact."
  },

  experience: [
    {
      role: "Full Stack Developer",
      company: "100x Bot by Y Combinator",
      location: "Bengaluru, Karnataka",
      startDate: "Jan 2026",
      endDate: "Present",
      responsibilities: [
        "Developed a Chrome-based AI browser automation tool to handle scraping, form filling, and workflow execution.",
        "Implemented user behavior learning and memory-based task optimization for smarter, adaptive automation.",
        "Built reusable automation workflows to significantly reduce repetitive manual effort."
      ]
    },
    {
      role: "Full Stack Developer",
      company: "InspironLabs Software Systems Private Limited",
      location: "Bengaluru, Karnataka",
      startDate: "Nov 2023",
      endDate: "Jan 2026",
      responsibilities: [
        "Developed a healthcare web platform (Discover Your Provider) using React, TypeScript, MobX, and Material UI, optimizing performance for large-scale data.",
        "Built a multi-language localization system (DYP Translator) with i18n, React, Redux, and RTK Query, optimizing for large datasets.",
        "Created an AI-driven feedback analysis platform (The Real Feel) processing 10,000+ responses, reducing analysis time by 75% using Next.js and TanStack Query.",
        "Integrated Mapbox for geolocation visualization and crafted responsive, accessible UIs with Tailwind CSS and SCSS.",
        "Led development teams across projects, driving architectural decisions, technical planning, code quality, and mentoring."
      ]
    }
  ],

  skills: [
    {
      id: "frontend",
      label: "Frontend",
      items: [
        { name: "React", level: "Advanced" },
        { name: "Next.js", level: "Advanced" },
        { name: "Redux", level: "Advanced" },
        { name: "TypeScript", level: "Advanced" },
        { name: "JavaScript", level: "Advanced" },
        { name: "HTML", level: "Advanced" },
        { name: "CSS", level: "Advanced" },
        { name: "Tailwind CSS", level: "Advanced" },
        { name: "MaterialUI", level: "Advanced" },
        { name: "Antd", level: "Intermediate" },
        { name: "SEO", level: "Intermediate" },
      ],
    },
    {
      id: "backend",
      label: "Backend",
      items: [
        { name: "Node.js", level: "Advanced" },
        { name: "Express", level: "Advanced" },
        { name: "Puppeteer", level: "Intermediate" },
        { name: "N8N", level: "Intermediate" },
      ],
    },
    {
      id: "data",
      label: "Data & DB",
      items: [
        { name: "MongoDB", level: "Advanced" },
        { name: "SQL", level: "Intermediate" },
        { name: "NoSQL", level: "Intermediate" },
        { name: "DSA", level: "Advanced" },
        { name: "AWS", level: "Intermediate" },
      ],
    },
    {
      id: "platform",
      label: "Platform",
      items: [
        { name: "GitHub", level: "Advanced" },
        { name: "GitLab", level: "Advanced" },
        { name: "NPM", level: "Advanced" },
        { name: "Jira", level: "Intermediate" },
      ],
    },
    {
      id: "mobile",
      label: "Mobile",
      items: [
        { name: "React Native", level: "Advanced" },
        { name: 'Expo', level: 'Advanced' },
        { name: 'GlueStack', level: 'Intermediate' },
        { name: "Native Base", level: "Intermediate" },
      ],
    },
    {
      id: "map",
      label: "Map",
      items: [
        { name: "ArcGIS", level: "Advanced" },
        { name: "Native Maps", level: "Intermediate" },
        { name: "Mapbox", level: "Intermediate" },
        { name: "Google Maps", level: "Advanced" },
      ],
    },
  ],

  projects: [
    {
      name: "The Real Feel",
      type: "WEB APP",
      description: "An AI-powered feedback analysis platform that transforms user feedback into actionable insights. Built with Next.js, Redux, and TanStack Query for efficient data handling, featuring Mapbox integration for geolocation and visualization, and a responsive, accessible UI with Tailwind CSS and Headless UI.",
      techStack: ["Next.js", "Tailwind", "TanStack", "Node.js", "Mapbox"],
      liveDemo: "https://www.therealfeel.ai/",
      code: true
    },
    {
      name: "DYP",
      type: "WEB APP",
      description: "A healthcare web platform built with React, TypeScript, MobX, and Material UI, delivering an intuitive and efficient user experience. Optimized performance for large-scale healthcare data and led a development team to ensure scalability, maintainability, and alignment with long-term business goals.",
      techStack: ["React", "TypeScript", "Mobx", "Material UI", "Scss"],
      liveDemo: "https://dyp2-sb-dev01.hhstechgroup.com/",
      liveDemoNote: "VPN required",
      code: true
    },
    {
      name: "Transletor",
      type: "WEB APP",
      description: "A multi-language management system enabling seamless translation and localization across the DYP platform. Built with React.js, Redux, and Material UI for a scalable, responsive interface. Optimized performance for large datasets and led a team to integrate multilingual features while ensuring code quality and maintainability.",
      techStack: ["React", "TypeScript", "i18n", "Redux", "Material UI"],
      liveDemo: "https://dyp2-sb-dev02.hhstechgroup.com/",
      liveDemoNote: "VPN required",
      code: true
    },
    {
      name: "Gossip",
      type: "MOBILE APP",
      description: "A real-time mobile chat application enabling users to message and interact seamlessly with friends. Built with React Native and Gluestack for a smooth, responsive UI, powered by Node.js, MongoDB, and Socket.IO for efficient real-time communication and scalable backend performance.",
      techStack: ["React Native", "Gluestack", "Node.js", "MongoDB", "Socket.IO"],
      liveDemo: null,
      code: true
    }
  ],

  recommendations: [
    {
      name: "Sonu Shettiyar",
      title: "Brand Evangelist @ Masai | Building Price Perfect AI | Ex-Accelgrowth",
      relation: "Studied together at Masai School",
      date: "November 8, 2025",
      text: "Sourav always stood out as one of the sharpest minds in the room. His problem-solving skills and coding abilities are exceptional, and he consistently delivered elegant solutions that impressed everyone. What truly sets him apart is his curiosity, drive for improvement, and refusal to settle for average. His level of maturity and technical depth at a young age is inspiring. Any team would be fortunate to have someone with his talent, focus, and positive attitude.",
      source: "LinkedIn Recommendation"
    },
    {
      name: "Manoj Kumar Nishad",
      title: "Senior Frontend Developer – React.js, Next.js, TypeScript, Redux Toolkit, Tailwind CSS",
      relation: "Worked together on the same team",
      date: "November 8, 2025",
      text: "I had the pleasure of working with Sourav Samanta, a dedicated and talented frontend developer. He is passionate about creating innovative solutions and consistently delivers high-quality work. A great team player and a true asset to any project.",
      source: "LinkedIn Recommendation"
    },
    {
      name: "Sagar Eknath Bangade",
      title: "Software Engineer @ InspironLabs | GenAI | MERN | Java Spring Boot | React Native",
      relation: "Reported directly to Sourav",
      date: "November 7, 2025",
      text: "Working closely with Sourav was a great experience. He is one of the most reliable and composed people I've worked with. Always focused, quick to help, and never afraid to tackle tough problems. A solid teammate and a great person to have on any project.",
      source: "LinkedIn Recommendation"
    }
  ],

  availability: ["Freelance", "Remote", "On-site"],

  navigation: ["HOME", "ABOUT", "SKILLS", "PROJECTS", "CONTACT"]
}
