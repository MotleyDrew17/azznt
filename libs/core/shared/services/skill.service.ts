import { Injectable } from '@angular/core';
import { Skill } from '../classes/skill.class';
import { CreateSkillData } from '../models/skill.model';

@Injectable({
  providedIn: 'root',
})
export class SkillService {
  skills: Skill[] = [];

  addSkill(data: CreateSkillData): Skill {
    const skill = new Skill(data);
    this.skills.push(skill);
    localStorage.setItem('skills', JSON.stringify(this.skills.map(skill => skill.toSnapshot())));
    return skill;
  }
}
