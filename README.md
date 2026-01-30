# SuperHireX - The Swipe-to-Work Evolution

A modern, Tinder-like job matching platform that revolutionizes how job seekers find opportunities and recruiters discover talent. Built with React, TypeScript, and powered by Supabase and Google Generative AI.

## 🚀 Features

### For Job Seekers
- **Swipe-Based Job Discovery**: Effortlessly browse job listings with intuitive left/right swipe gestures
- **Smart Matching**: AI-powered job recommendations tailored to your profile
- **Real-Time Notifications**: Get instant alerts when both you and an employer express mutual interest
- **Detailed Job Cards**: View comprehensive job information including salary, requirements, and company details

### For Recruiters
- **Talent Discovery**: Browse candidate profiles with an intuitive card-based interface
- **Quick Assessment**: Swipe left to pass or right to express interest for interviews
- **Mutual Matching**: Automatic match notifications when candidates are also interested
- **Profile Analytics**: Access candidate profiles with skills, experience, and portfolio links

### General Features
- **Dual-Mode Authentication**: Separate auth flows for job seekers and recruiters
- **Real-Time Notifications**: Instant match alerts with smooth animations
- **Demo Mode**: Works without backend connection for demo purposes
- **Responsive Design**: Fully optimized for desktop and mobile devices
- **Dark Theme UI**: Modern, sleek interface with smooth animations

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database + Auth)
- **AI/ML**: Google Generative AI (@google/genai)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Authentication**: Supabase Auth

## 📁 Project Structure

```
SuperHireX/
├── components/
│   ├── AuthForm.tsx          # Authentication component for login/signup
│   ├── CandidateCard.tsx     # Candidate profile display component
│   ├── JobCard.tsx           # Job listing display component
│   └── SwipeCard.tsx         # Swipeable card wrapper component
├── services/
│   ├── authService.ts        # Authentication logic and user profile management
│   ├── dataService.ts        # Fetch and manage jobs/candidates data
│   ├── geminiService.ts      # Google Generative AI integration
│   └── swipeService.ts       # Handle swipe interactions and match logic
├── lib/
│   └── supabase.ts           # Supabase client configuration
├── App.tsx                   # Main application component
├── types.ts                  # TypeScript interfaces and enums
├── constants.tsx             # Mock data and constants
├── index.tsx                 # React DOM render entry point
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies
```

## 🎯 User Roles

### Job Seeker (SEEKER)
- Browse available job postings
- Swipe right to apply to jobs or left to skip
- Receive notifications when both parties match
- View comprehensive job details including salary, location, and requirements

### Recruiter (RECRUITER)
- Browse candidate profiles
- Swipe right to express interview interest or left to pass
- Receive notifications when candidates are also interested
- Access candidate skills, experience, and portfolio information

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Supabase account and project credentials
- Google Generative AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/SuperHireX.git
   cd SuperHireX
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_google_generative_ai_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🔄 Core Workflows

### Authentication Flow
1. User selects role (Job Seeker or Recruiter)
2. User authenticates via AuthForm (signup/login)
3. User profile is loaded from Supabase
4. App loads relevant data (jobs or candidates)

### Swiping & Matching
1. User views card in swipe interface
2. User swipes left (pass) or right (express interest)
3. Swipe action is recorded in Supabase via `swipeService`
4. System checks for mutual interest matches
5. If matched, notification animates and displays

### Data Flow
- **Job Seekers**: `dataService.getJobs()` → Display job cards → User swipes
- **Recruiters**: `dataService.getCandidates()` → Display candidate cards → User swipes
- **Matching**: `swipeService.recordSwipe()` → Check mutual interest → Trigger notifications

## 🤖 AI Integration

The app integrates Google Generative AI (`geminiService.ts`) to:
- Provide intelligent job recommendations based on candidate profiles
- Generate match insights and compatibility scores
- Power potential smart filtering and scoring features

## 📱 Key Components

### SwipeCard
- Wraps content in a swipeable container
- Handles left/right swipe detection
- Triggers callbacks on swipe completion

### AuthForm
- Role-specific authentication interface
- Handles signup and login flows
- Manages user profile creation

### JobCard
- Displays job title, company, salary, and requirements
- Shows job description and company logo
- Interactive for additional details

### CandidateCard
- Shows candidate name, title, and experience
- Displays skills and bio
- Links to resume or portfolio

## 🔐 Security & Environment

- Credentials are managed through environment variables
- Supabase provides built-in authentication and authorization
- App gracefully degrades if backend credentials are missing (Demo Mode)
- Sensitive data is never committed to version control

## 🎨 UI/UX Features

- **Smooth Animations**: Powered by Framer Motion for card transitions and notifications
- **Dark Theme**: Professional dark interface with white/colored accents
- **Real-Time Feedback**: Instant visual feedback on user actions
- **Responsive Layout**: Adapts seamlessly across device sizes
- **Match Notifications**: Full-screen match celebration with animations

## 📈 Future Enhancements

- Message inbox for matched parties
- Advanced filtering and search
- Profile completion progress tracking
- Skill-based job recommendations
- Video profile support
- Analytics dashboard for recruiters

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bug reports and feature suggestions.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions, please reach out to the development team or open an issue on GitHub.

---

**Built with ❤️ for the future of hiring**
