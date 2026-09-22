import React, { useState } from 'react';
import { Lock, Unlock, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  pinCode: string;
  onSuccessUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  pinCode,
  onSuccessUnlock
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      setErrorMsg('');
      if (newPin.length === 4) {
        if (newPin === pinCode || (!pinCode && newPin === '1234')) {
          onSuccessUnlock();
          setEnteredPin('');
        } else {
          setErrorMsg('Incorrect PIN. Please try again.');
          setTimeout(() => setEnteredPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setEnteredPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-sm flex flex-col items-center rounded-3xl bg-[#0f1422] border border-white/10 shadow-2xl p-6 text-center">
        {/* Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-cinzel font-bold text-slate-100 tracking-wider">
          MOVA DETA
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter 4-Digit Security PIN to Access
        </p>

        {/* 4-dot PIN indicator */}
        <div className="flex items-center justify-center gap-3 my-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < enteredPin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-400 scale-110 shadow-md shadow-amber-400/50'
                    : 'bg-slate-800 border border-white/10'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 mb-3 animate-shake font-medium">
            {errorMsg}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-amber-500/20 active:scale-95 border border-white/5 text-lg font-bold text-slate-100 hover:text-amber-300 transition flex items-center justify-center select-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/40 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition flex items-center justify-center select-none"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="h-14 rounded-2xl bg-slate-900/90 hover:bg-amber-500/20 active:scale-95 border border-white/5 text-lg font-bold text-slate-100 hover:text-amber-300 transition flex items-center justify-center select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900/40 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition flex items-center justify-center select-none"
          >
            Del
          </button>
        </div>

        {/* Disclaimer */}
        <div className="pt-2 text-[10px] text-slate-500 flex items-center gap-1.5 leading-tight">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
          <span>
            PIN Lock is a local convenience lock and does not replace server security.
          </span>
        </div>
      </div>
    </div>
  );
};
