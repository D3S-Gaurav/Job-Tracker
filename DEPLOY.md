# How to Host Your Job Tracker

Since "hosting" involves putting your app on the internet, here are the industry-standard ways to do it with the files I've prepared.

## Option 1: Render.com (Easiest for Backend + DB)
I have created a `render.yaml` file that allows you to deploy the **Database**, **Backend**, and **Frontend** all together.

1.  Push your code to GitHub/GitLab.
2.  Sign up at [Render.com](https://render.com).
3.  Click "New" -> "Blueprint".
4.  Connect your repository.
5.  Render will automatically read `render.yaml` and deploy:
    *   A **PostgreSQL Database**.
    *   The **Node.js/Express Backend**.
    *   The **Next.js Frontend**.

## Option 2: Vercel (Best for Frontend) + Railway/Render (Backend)

### Frontend (Vercel)
I added a `vercel.json` config.
1.  Run `npx vercel` in `apps/client` (or connect via Vercel dashboard).
2.  It will deploy your frontend globally.

### Backend & Database
Since Docker isn't running locally, you need a cloud database.
1.  Use **Railway.app** or **Render** to spin up a Postgres DB.
2.  Get the `DATABASE_URL` from them.
3.  Set this `DATABASE_URL` in your backend deployment environment variables.

## Local "Hosting"
To run everything locally (requires Docker):
1.  `docker-compose up -d` (Starts DB)
2.  `cd apps/server && npm run dev` (Starts Backend on :4000)
3.  `cd apps/client && npm run dev` (Starts Frontend on :3000)
