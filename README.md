
https://apex-robotics-qr.netlify.app/



This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Organizer Security (Phase 2)

- Organizer auth uses per-token scope and server-issued `httpOnly` sessions.
- Mutations in `/api/torneos/secure-write` are allowed only for tournaments included in the session scope.
- Organizer tokens are persisted hashed (`scrypt + salt`) in `public.organizer_tokens`.
- Sessions are persisted in `public.organizer_sessions` to support revocation.

### Temporary compatibility fallback

- The legacy token (`areivan`, from `ORGANIZER_MODE_TOKEN`) remains enabled only while there are zero rows in `public.organizer_tokens`.
- As soon as at least one organizer token exists, legacy fallback is disabled automatically.

### Apply migrations

Run these commands from the repository root:

```bash
supabase db push
```

If you run against a linked remote project and want to include all local migrations explicitly:

```bash
supabase db push --include-all
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
