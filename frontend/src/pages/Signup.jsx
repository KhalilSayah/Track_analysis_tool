import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  useEffect(() => {
    document.title = "Sign Up | Karting Analysis";
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create an account: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-dot-pattern p-4">
      <Card className="w-full max-w-[500px] bg-zinc-900/70 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-[40px]">
        <CardBody className="p-10 flex flex-col items-center">
          
          {/* Logo */}
          <div className="mb-10 relative group">
             <div className="absolute inset-0 bg-[#e8fe41] blur-3xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity duration-500"></div>
             <img 
               src="/dove.svg" 
               alt="Logo" 
               className="relative w-28 h-28 object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
             />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          
          <div className="flex gap-1 text-sm text-gray-400 mb-10">
            <span>Already have an account?</span>
            <Link to="/login" className="text-white font-bold hover:text-[#e8fe41] transition-colors">Login</Link>
          </div>

          {error && <div className="w-full p-3 mb-6 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl text-sm text-center">{error}</div>}

          <form onSubmit={handleSignup} className="w-full space-y-4">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              startContent={<Mail size={18} className="text-zinc-500 pointer-events-none flex-shrink-0" />}
              classNames={{
                input: "text-white placeholder:text-zinc-600 font-medium ml-2",
                inputWrapper: "bg-zinc-900 border-zinc-800 hover:border-zinc-700 focus-within:!border-zinc-600 rounded-2xl h-14 px-4 flex items-center data-[hover=true]:bg-zinc-900 group-data-[focus=true]:bg-zinc-900"
              }}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              startContent={<Lock size={18} className="text-zinc-500 pointer-events-none flex-shrink-0" />}
              classNames={{
                input: "text-white placeholder:text-zinc-600 font-medium ml-2",
                inputWrapper: "bg-zinc-900 border-zinc-800 hover:border-zinc-700 focus-within:!border-zinc-600 rounded-2xl h-14 px-4 flex items-center data-[hover=true]:bg-zinc-900 group-data-[focus=true]:bg-zinc-900"
              }}
            />
            <Input
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              startContent={<Lock size={18} className="text-zinc-500 pointer-events-none flex-shrink-0" />}
              classNames={{
                input: "text-white placeholder:text-zinc-600 font-medium ml-2",
                inputWrapper: "bg-zinc-900 border-zinc-800 hover:border-zinc-700 focus-within:!border-zinc-600 rounded-2xl h-14 px-4 flex items-center data-[hover=true]:bg-zinc-900 group-data-[focus=true]:bg-zinc-900"
              }}
            />
            
            <Button
              type="submit"
              className="w-full font-bold text-black text-lg bg-[#e8fe41] hover:bg-[#d6eb3b] rounded-2xl h-14 shadow-[0_0_30px_rgba(232,254,65,0.2)] hover:shadow-[0_0_40px_rgba(232,254,65,0.4)] transition-all mt-4"
              isLoading={isLoading}
            >
              Sign Up
            </Button>
          </form>

          <div className="w-full flex items-center gap-4 my-8">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">OR</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </div>

          <div className="flex gap-4 w-full">
            <Button isIconOnly className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 rounded-2xl h-14 transition-all flex items-center justify-center">
               <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M13.0729 17.6104C13.0729 17.6104 16.0954 17.6338 17.7004 15.6571C17.7004 15.6571 16.1421 14.6521 16.1421 12.4079C16.1421 10.4688 17.8404 9.48712 17.8404 9.48712C17.8404 9.48712 16.3288 7.33712 13.9371 7.33712C12.8638 7.33712 11.9521 8.01379 11.2754 8.01379C10.5988 8.01379 9.57042 7.26712 8.35542 7.29046C5.69209 7.31379 2.93542 9.55712 2.93542 14.2288C2.93542 16.2138 3.68209 18.2638 4.70875 19.7121C5.78209 21.2304 6.85542 22.8421 8.56542 22.8421C9.61542 22.8421 9.98875 22.1888 11.2954 22.1888C12.6021 22.1888 12.9288 22.8421 14.0721 22.8188C15.8238 22.7954 16.8271 21.2304 17.8538 19.7354C18.6004 18.6621 18.9038 17.6104 18.9038 17.6104C18.9038 17.6104 15.9554 16.5121 15.9554 13.5288C15.9554 11.0521 17.9338 9.69712 17.9338 9.69712C16.5154 7.64046 14.0254 7.33712 13.9371 7.33712ZM12.0454 5.25879C12.6054 4.58212 13.0021 3.67046 13.0021 2.73712C13.0021 2.62046 12.9788 2.48046 12.9788 2.38712C12.0688 2.43379 10.9954 2.99379 10.3421 3.76379C9.75875 4.44046 9.29209 5.37546 9.29209 6.28712C9.29209 6.42712 9.31542 6.54379 9.31542 6.54379C10.2954 6.61379 11.3921 6.00712 12.0454 5.25879Z"/></svg>
            </Button>
            <Button isIconOnly className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 rounded-2xl h-14 transition-all flex items-center justify-center">
               <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </Button>
            <Button isIconOnly className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 rounded-2xl h-14 transition-all flex items-center justify-center">
               <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </Button>
          </div>

        </CardBody>
      </Card>
    </div>
  );
};

export default Signup;