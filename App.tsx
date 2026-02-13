
import React from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import AdminView from './views/AdminView';
import DisplayView from './views/DisplayView';
import TeamView from './views/TeamView';
import { BrainCircuit, Settings, Monitor, Users } from 'lucide-react';

const Home: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl mb-12">
      <BrainCircuit className="w-24 h-24 text-white" />
    </div>
    <h1 className="text-5xl font-bold text-slate-900 mb-4 font-display">DUK AI QUIZ</h1>
    <p className="text-xl text-slate-500 mb-12 max-w-lg">
      Enterprise-grade real-time AI-led competitive quiz platform for academic events.
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
      <Link to="/admin" className="p-8 bg-white rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:scale-105 transition-all group">
        <Settings className="w-12 h-12 text-slate-400 group-hover:text-slate-900 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Admin</h2>
        <p className="text-slate-500 mt-2">Control panel for hosts and technical staff.</p>
      </Link>
      
      <Link to="/display" className="p-8 bg-white rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:scale-105 transition-all group">
        <Monitor className="w-12 h-12 text-slate-400 group-hover:text-slate-900 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Display</h2>
        <p className="text-slate-500 mt-2">Large-format presentation screen for audience.</p>
      </Link>
      
      <Link to="/team" className="p-8 bg-white rounded-3xl shadow-md border border-slate-200 hover:shadow-xl hover:scale-105 transition-all group">
        <Users className="w-12 h-12 text-slate-400 group-hover:text-slate-900 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Team</h2>
        <p className="text-slate-500 mt-2">Participant interface for competing teams.</p>
      </Link>
    </div>
    
    <footer className="mt-20 text-slate-400 flex items-center gap-4 text-sm font-medium tracking-widest uppercase">
      <span>Amazon Web Services</span>
      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
      <span>Amplify</span>
      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
      <span>Bedrock AI</span>
    </footer>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/display" element={<DisplayView />} />
        <Route path="/team" element={<TeamView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
