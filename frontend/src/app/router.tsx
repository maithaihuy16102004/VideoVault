import React from 'react';
import {
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
    lazyRouteComponent
} from '@tanstack/react-router';
import Dashboard from '../routes/dashboard';
import AdminDashboard from '../routes/admin/dashboard';
import Subscriptions from '../routes/subscriptions';
import Downloads from '../routes/downloads';
import Analytics from '../routes/admin/analytics';
import AuthPage from '../routes/auth';
import MainLayout from './MainLayout';

// Root Route
const rootRoute = createRootRoute({
    component: () => <MainLayout />,
});

// Auth Route
const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'login',
    component: AuthPage,
});

// User Routes
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Dashboard,
});

const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'dashboard',
    component: Dashboard,
});

const subscriptionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'subscriptions',
    component: Subscriptions,
});

const downloadsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'downloads',
    component: Downloads,
});

// Admin Routes
const adminDashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'admin/dashboard',
    component: AdminDashboard,
});

const analyticsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'admin/analytics',
    component: Analytics,
});

const promotionAuditRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'admin/promotion-audit',
    component: lazyRouteComponent(() => import('@/routes/admin/promotion-audit')),
});

// Route Tree
const routeTree = rootRoute.addChildren([
    indexRoute,
    authRoute,
    dashboardRoute,
    subscriptionsRoute,
    downloadsRoute,
    // Download Sub-routes
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'downloads/account',
        component: lazyRouteComponent(() => import('@/routes/downloads/account')),
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'downloads/hashtag',
        component: lazyRouteComponent(() => import('@/routes/downloads/hashtag')),
    }),
    // Automation routes
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'automation/pipeline',
        component: lazyRouteComponent(() => import('@/routes/automation/pipeline')),
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'automation/stt',
        component: lazyRouteComponent(() => import('@/routes/automation/stt')),
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'automation/translate',
        component: lazyRouteComponent(() => import('@/routes/automation/translate')),
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'automation/voice',
        component: lazyRouteComponent(() => import('@/routes/automation/voice')),
    }),
    // Growth routes
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'growth/promote',
        component: lazyRouteComponent(() => import('@/routes/growth/promote')),
    }),
    // Library routes
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'library/storage',
        component: lazyRouteComponent(() => import('@/routes/library/storage')),
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'library/projects',
        component: lazyRouteComponent(() => import('@/routes/library/projects')),
    }),
    // Analytics & Affiliate
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'analytics/viral',
        component: lazyRouteComponent(() => import('@/routes/analytics/viral')),
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: 'affiliate',
        component: lazyRouteComponent(() => import('@/routes/affiliate/index')),
    }),
    adminDashboardRoute,
    analyticsRoute,
    promotionAuditRoute,
]);

// eslint-disable-next-line react-refresh/only-export-components
export const router = createRouter({ routeTree });

export const AppRouter: React.FC = () => (
    <RouterProvider router={router} />
);

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
