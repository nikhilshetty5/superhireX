import React, { useState, useRef } from 'react';
import { Upload, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeUploadProps {
  userId: string;
  userEmail?: string;
  onSuccess: (data: any) => void;
  onSkip: () => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ userId, onSuccess, onSkip }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] =
    useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (
      selected.type === 'application/pdf' ||
      selected.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      setFile(selected);
      setStatus('idle');
      setMessage('');
    } else {
      setStatus('error');
      setMessage('Please upload a PDF or DOCX file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setStatus('uploading');
    setMessage('Uploading resume...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const tokenRaw = localStorage.getItem(
        'sb-bicdhlzwtmrgppvoveqh-auth-token'
      );
      const authToken = tokenRaw ? JSON.parse(tokenRaw).access_token : '';

      // 1️⃣ Upload
      const uploadRes = await fetch(
        'http://localhost:8001/api/resume/upload',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        }
      );

      if (!uploadRes.ok) throw new Error('Resume upload failed');

      const { resume_id } = await uploadRes.json();

      // 2️⃣ Parse
      setStatus('parsing');
      setMessage('🤖 AI is analyzing your resume...');

      const parseRes = await fetch(
        `http://localhost:8001/api/resume/parse?resume_id=${resume_id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!parseRes.ok) throw new Error('Resume parsing failed');

      const parseResult = await parseRes.json();

      // 3️⃣ Success
      setStatus('success');
      setMessage('Resume analyzed successfully');

      // 🔑 Notify parent ONLY
      onSuccess(parseResult);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-8 bg-[#1A1A1A] border border-white/10 rounded-2xl"
    >
      <h2 className="text-3xl font-black text-white text-center mb-2">
        Upload Resume
      </h2>
      <p className="text-white/50 text-center mb-8">
        Let AI understand your profile
      </p>

      <AnimatePresence mode="wait">
        {(status === 'idle' || status === 'error') && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-xl p-6 cursor-pointer text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="mx-auto text-white/40 mb-3" />
              <p className="text-white">
                {file ? file.name : 'Click to upload resume'}
              </p>
            </div>

            {status === 'error' && (
              <div className="text-red-400 text-sm flex gap-2">
                <AlertCircle size={16} />
                {message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="w-1/2 bg-white/10 text-white rounded-lg py-3"
              >
                Skip
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-1/2 bg-blue-500 text-white rounded-lg py-3 disabled:opacity-50"
              >
                {loading ? <Loader className="animate-spin mx-auto" /> : 'Upload'}
              </button>
            </div>
          </motion.div>
        )}

        {status === 'parsing' && (
          <motion.div
            key="parsing"
            className="text-center space-y-4"
          >
            <Loader className="animate-spin mx-auto text-blue-500" />
            <p className="text-white/70">{message}</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            className="text-center space-y-6"
          >
            <CheckCircle2 className="mx-auto text-green-500" size={48} />
            <p className="text-white/80">{message}</p>
            <button
              onClick={onSkip}
              className="w-full bg-green-500 text-white rounded-lg py-3 font-bold"
            >
              Continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ResumeUpload;
