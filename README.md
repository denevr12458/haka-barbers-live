# Haka Barbers - Booking System

A professional barber shop booking system built with Node.js, Express, and PostgreSQL.

## Features

✅ Customer booking system with real-time availability  
✅ Admin dashboard to manage bookings, services, and blocked slots  
✅ Email confirmations and notifications  
✅ Rate limiting and security headers  
✅ Responsive design  
✅ Railway deployment ready  

## Quick Start (Local Development)

```bash
# Install Node.js 18+ with nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 18

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and email settings

# Start the server
node server.js
```

Visit `http://localhost:3000`

## Deployment on Railway

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repo
   - Railway will auto-detect Node.js and deploy

3. **Set Environment Variables in Railway Dashboard**
   ```
   SESSION_SECRET=your-secret-key-here-make-it-long
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-gmail-app-password
   OWNER_EMAIL=your-email@gmail.com
   SITE_URL=https://your-app-name.railway.app
   NODE_ENV=production
   ```

4. **Add PostgreSQL**
   - In Railway dashboard, click "Add"
   - Select "Database" → "PostgreSQL"
   - Railway automatically sets DATABASE_URL

## Admin Access

After deployment, access the admin panel at `/admin`

**Default credentials:**
- Username: `admin`
- Password: `admin123`

Change these credentials immediately after first login.

## Services Included

- Classic Cut (30 min, £25)
- Fade & Taper (45 min, £35)
- Beard Trim (20 min, £15)
- Hot Towel Shave (30 min, £30)
- Full Service (75 min, £70)

## Customization

### Update Services
Go to admin dashboard → Services tab to add, edit, or delete services

### Update Hours
Edit `config/hours.js` to change opening hours

### Customize Styling
Edit `public/css/style.css` to match your branding

### Update Shop Details
Edit `config/email.js` to update shop name, address, contact info

## Troubleshooting

### Health check failures on Railway
- The app is designed to start instantly and respond to `/health` within seconds
- If still failing, check Railway logs: `railway logs`

### Database connection errors
- Verify DATABASE_URL is set in Railway dashboard
- Check that PostgreSQL service is active in Railway

### Email not sending
- Use Gmail app passwords (not regular password)
- Enable "Less secure apps" if using non-Gmail SMTP
- Check SMTP_* environment variables are set

## Project Structure

```
├── config/
│   ├── database.js      # PostgreSQL setup
│   ├── email.js         # Email templates and sending
│   └── hours.js         # Opening hours configuration
├── routes/
│   ├── public.js        # Customer booking endpoints
│   └── admin.js         # Admin management endpoints
├── middleware/
│   └── auth.js          # Authentication middleware
├── public/
│   ├── index.html       # Frontend
│   ├── admin-login.html # Admin login
│   ├── admin-dashboard.html # Admin panel
│   ├── css/style.css
│   └── js/main.js
├── server.js            # Express app entry point
├── package.json
└── railway.json         # Railway deployment config
```

## API Endpoints

### Public
- `GET /api/services` - List all services
- `GET /api/availability` - Check availability for date/service
- `POST /api/bookings` - Create new booking

### Admin (requires authentication)
- `GET /admin/dashboard` - Admin panel
- `GET /admin/api/bookings` - List bookings
- `PATCH /admin/api/bookings/:id` - Update booking status
- `GET/POST/PUT/DELETE /admin/api/services` - Manage services
- `GET/POST/DELETE /admin/api/blocks` - Manage blocked slots
- `GET /admin/api/stats` - Get statistics

## Support

For issues or questions, check the Railway logs or contact support.
