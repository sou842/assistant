// skills/index.js
// This file initializes the global Skill Registry for the extension.

self.SkillRegistry = {
  skills: [],
  
  register: function(skill) {
    if (!skill || !skill.name || !skill.domain) {
      console.error("[Jarvis Skills] Invalid skill registration attempt.");
      return;
    }
    this.skills.push(skill);
    console.log(`[Jarvis Skills] Registered skill: ${skill.name}`);
  },

  getSkillForUrl: function(url) {
    if (!url) return null;
    return this.skills.find(skill => {
      if (skill.domain instanceof RegExp) {
        return skill.domain.test(url);
      }
      return url.includes(skill.domain);
    }) || null;
  }
};
