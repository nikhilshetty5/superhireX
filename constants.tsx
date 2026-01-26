
import { Job, Candidate } from './types';

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Senior Frontend Engineer',
    company: 'TechFlow',
    location: 'Remote',
    salary: '$140k - $180k',
    description: 'Looking for a React expert with deep knowledge of performance optimization.',
    requirements: ['React', 'TypeScript', 'Tailwind CSS'],
    postedAt: '2h ago',
    logo: 'https://picsum.photos/seed/tech/100/100'
  },
  {
    id: 'j2',
    title: 'Product Designer',
    company: 'Canvas AI',
    location: 'San Francisco, CA',
    salary: '$120k - $160k',
    description: 'Join our design team to build the future of generative UI.',
    requirements: ['Figma', 'UI/UX', 'Prototyping'],
    postedAt: '5h ago',
    logo: 'https://picsum.photos/seed/design/100/100'
  },
  {
    id: 'j3',
    title: 'Fullstack Developer',
    company: 'Kergox',
    location: 'Hybrid',
    salary: '$130k - $170k',
    description: 'Help us scale the next generation of job matching platforms.',
    requirements: ['Node.js', 'PostgreSQL', 'React'],
    postedAt: '1d ago',
    logo: 'https://picsum.photos/seed/kergox/100/100'
  }
];

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Sarah Chen',
    title: 'Fullstack Developer',
    experience: '5 years',
    location: 'Seattle, WA',
    skills: ['React', 'Node.js', 'AWS'],
    bio: 'Passionate about building scalable web applications and distributed systems.',
    avatar: 'https://picsum.photos/seed/sarah/200/200'
  },
  {
    id: 'c2',
    name: 'Marcus Thorne',
    title: 'Lead Designer',
    experience: '8 years',
    location: 'Austin, TX',
    skills: ['Product Design', 'Figma', 'Strategy'],
    bio: 'Design leader focused on creating intuitive experiences for complex B2B platforms.',
    avatar: 'https://picsum.photos/seed/marcus/200/200'
  },
  {
    id: 'c3',
    name: 'Elena Rodriguez',
    title: 'DevOps Engineer',
    experience: '4 years',
    location: 'Remote',
    skills: ['Docker', 'Kubernetes', 'CI/CD'],
    bio: 'Automating everything from deployment to monitoring. Infrastructure as code advocate.',
    avatar: 'https://picsum.photos/seed/elena/200/200'
  }
];
