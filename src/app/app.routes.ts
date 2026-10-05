import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '', 
        loadComponent: () => import('../../libs/feature/shell/shell.component').then(m => m.ShellComponent),
        children: [
            {
                path: 'editor',
                loadComponent: () => import('../../libs/feature/editor/editor.component').then(m => m.EditorComponent)
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
