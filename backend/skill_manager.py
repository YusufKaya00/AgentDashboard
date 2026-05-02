import json
import os
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from storage import StorageManager

class SkillManager:
    def __init__(self):
        self.skills = StorageManager.get_skills()
        self._initialize_default_skills()

    def _initialize_default_skills(self):
        default_skills = [
            {
                "id": "update-config",
                "name": "update-config",
                "description": "Configure the Claude Code harness via settings.json",
                "category": "configuration",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "keybindings-help",
                "name": "keybindings-help",
                "description": "Customize keyboard shortcuts and keybindings",
                "category": "configuration",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "simplify",
                "name": "simplify",
                "description": "Review changed code for reuse, quality, and efficiency",
                "category": "code-review",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "init",
                "name": "init",
                "description": "Initialize a new CLAUDE.md file with codebase documentation",
                "category": "documentation",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "review",
                "name": "review",
                "description": "Review a pull request",
                "category": "code-review",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "security-review",
                "name": "security-review",
                "description": "Complete a security review of the pending changes",
                "category": "security",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "fewer-permission-prompts",
                "name": "fewer-permission-prompts",
                "description": "Scan transcripts for common read-only Bash and MCP tool calls",
                "category": "configuration",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "loop",
                "name": "loop",
                "description": "Run a prompt or slash command on a recurring interval",
                "category": "automation",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "schedule",
                "name": "schedule",
                "description": "Create, update, list, or run scheduled remote agents",
                "category": "automation",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            },
            {
                "id": "claude-api",
                "name": "claude-api",
                "description": "Build, debug, and optimize Claude API / Anthropic SDK apps",
                "category": "development",
                "enabled": True,
                "config": {},
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            }
        ]

        for skill in default_skills:
            if not any(s.get("id") == skill["id"] for s in self.skills):
                self.skills.append(skill)

        StorageManager.save_skills(self.skills)

    def get_all_skills(self) -> List[dict]:
        return self.skills

    def get_skill(self, skill_id: str) -> Optional[dict]:
        for skill in self.skills:
            if skill.get("id") == skill_id:
                return skill
        return None

    def add_skill(self, skill_data: dict) -> dict:
        skill_id = skill_data.get("id", str(uuid.uuid4()))
        new_skill = {
            "id": skill_id,
            "name": skill_data.get("name", skill_id),
            "description": skill_data.get("description", ""),
            "category": skill_data.get("category", "custom"),
            "enabled": skill_data.get("enabled", True),
            "config": skill_data.get("config", {}),
            "created_at": datetime.now().isoformat(),
            "usage_count": 0
        }
        self.skills.append(new_skill)
        StorageManager.save_skills(self.skills)
        return new_skill

    def update_skill(self, skill_id: str, skill_data: dict) -> Optional[dict]:
        for i, skill in enumerate(self.skills):
            if skill.get("id") == skill_id:
                self.skills[i] = {**skill, **skill_data, "id": skill_id}
                StorageManager.save_skills(self.skills)
                return self.skills[i]
        return None

    def delete_skill(self, skill_id: str) -> bool:
        for i, skill in enumerate(self.skills):
            if skill.get("id") == skill_id:
                self.skills.pop(i)
                StorageManager.save_skills(self.skills)
                return True
        return False

    def toggle_skill(self, skill_id: str) -> Optional[dict]:
        skill = self.get_skill(skill_id)
        if skill:
            skill["enabled"] = not skill.get("enabled", True)
            StorageManager.save_skills(self.skills)
            return skill
        return None

    def increment_usage(self, skill_id: str):
        skill = self.get_skill(skill_id)
        if skill:
            skill["usage_count"] = skill.get("usage_count", 0) + 1
            StorageManager.save_skills(self.skills)

    def get_skills_by_category(self, category: str) -> List[dict]:
        return [s for s in self.skills if s.get("category") == category]

    def get_enabled_skills(self) -> List[dict]:
        return [s for s in self.skills if s.get("enabled", True)]

    def get_skill_stats(self) -> dict:
        total = len(self.skills)
        enabled = len([s for s in self.skills if s.get("enabled", True)])
        categories = {}
        for skill in self.skills:
            cat = skill.get("category", "other")
            categories[cat] = categories.get(cat, 0) + 1

        return {
            "total": total,
            "enabled": enabled,
            "disabled": total - enabled,
            "categories": categories,
            "most_used": sorted(self.skills, key=lambda x: x.get("usage_count", 0), reverse=True)[:5]
        }

skill_manager = SkillManager()
