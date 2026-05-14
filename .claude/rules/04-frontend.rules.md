# Frontend Architecture (React 18 + Vite + TanStack)

## 4.1 Frontend Stack
- **Framework**: React 18 + Vite
- **Routing**: TanStack Router
- **State Management**: Zustand
- **Server State**: TanStack Query
- **Forms**: React Hook Form + Zod
- **UI Library**: shadcn/ui
- **Styling**: TailwindCSS
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Realtime**: SignalR Client
- **HTTP Client**: Axios
- **Auth Storage**: HttpOnly Cookies
- **Animation**: Framer Motion
- **Build Tool**: Vite

## 4.2 Folder Structure
```
frontend/
├── src/
│   ├── app/
│   ├── routes/
│   ├── features/
│   │   ├── auth/
│   │   ├── downloads/
│   │   ├── billing/
│   │   ├── admin/
│   │   └── analytics/
│   │
│   ├── shared/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── store/
│   └── main.tsx
│
├── public/
└── vite.config.ts
```

## 4.3 API Layer Pattern
```ts
// shared/api/download.api.ts
export const createDownloadJob = async (payload: CreateJobRequest) => {
  const response = await api.post('/downloads', payload);
  return response.data;
};
```

## 4.4 TanStack Query Example
```ts
export const useDownloadHistory = () => {
  return useQuery({
    queryKey: ['downloads'],
    queryFn: getDownloadHistory,
  });
};