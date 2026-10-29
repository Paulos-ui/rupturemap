import dynamic from 'next/dynamic';
const CommandCenter = dynamic(() => import('@/components/command-center'));
export default function Home() { return <CommandCenter />; }
