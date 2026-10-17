import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '', 
        loadComponent: () => import('../../libs/feature/shell/shell.component').then(m => m.ShellComponent),
        children: [
            { path: '', redirectTo: 'storylines', pathMatch: 'full' },
            { path: 'editor', redirectTo: '/quest-tree', pathMatch: 'full' },
            {
                path: 'storylines',
                loadComponent: () => import('../../libs/feature/storylines/storylines.component').then(m => m.StorylinesComponent)
            },
            {
                path: 'quest-tree',
                loadComponent: () => import('../../libs/feature/editor/editor.component').then(m => m.EditorComponent)
            },
            {
                path: 'skills',
                loadComponent: () => import('../../libs/feature/skills/skills.component').then(m => m.SkillsComponent)
            },
            {
                path: 'settings',
                loadComponent: () => import('../../libs/feature/settings/settings.component').then(m => m.SettingsComponent)
            },
            {
                path: 'skill/:id/stats',
                loadComponent: () => import('../../libs/feature/skills/skill-page/stats/skill-stats.component').then(m => m.SkillStatsComponent)
            },
            {
                path: 'skill/:id',
                loadComponent: () => import('../../libs/feature/skills/skill-page/skill-page.component').then(m => m.SkillPageComponent)
            }
        ]
    },
    {
        path: 'auth',
        loadComponent: () => import('../../libs/feature/auth/auth.component').then(m => m.AuthComponent)
    },
    {path: 'register', loadComponent: () => import('../../libs/feature/register/register.component').then(m => m.RegisterComponent)},
    {path: '**', redirectTo: ''}
];
