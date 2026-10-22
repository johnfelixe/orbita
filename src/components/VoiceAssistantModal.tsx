import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../types';
import {
  buildPendingSpeech,
  findPendingTasksForIntent,
  parseVoiceCommand,
  speakSpanish,
  stopSpeaking,
  type VoiceIntent,
} from '../utils/voiceAssistant';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  selectedDate: string;
  tasks: Task[];
  currentWeekNumber: number;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  selectedDate,
  tasks,
  currentWeekNumber,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const [queryTasks, setQueryTasks] = useState<Task[]>([]);
  const [spokenAnswer, setSpokenAnswer] = useState('');
  const recognitionRef = useRef<any>(null);
  const lastSpokenRef = useRef('');

  const examplePrompts = [
    'Agrégame una tarea para mañana de comprar pan',
    'Tareas pendientes esta semana',
    'Pendientes de hoy',
  ];

  const resetVoiceSession = () => {
    stopSpeaking();
    recognitionRef.current?.stop?.();
    setIsListening(false);
    setTranscript('');
    setIntent(null);
    setQueryTasks([]);
    setSpokenAnswer('');
    lastSpokenRef.current = '';
  };

  useEffect(() => {
    if (!isOpen) {
      resetVoiceSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!transcript.trim()) {
      setIntent(null);
      setQueryTasks([]);
      setSpokenAnswer('');
      return;
    }

    const parsed = parseVoiceCommand(transcript, selectedDate);
    setIntent(parsed);

    if (parsed.type === 'query') {
      const pending = findPendingTasksForIntent(tasks, parsed);
      setQueryTasks(pending);
      setSpokenAnswer(buildPendingSpeech(pending, parsed.label));
    } else {
      setQueryTasks([]);
      setSpokenAnswer('');
      stopSpeaking();
    }
  }, [isOpen, transcript, selectedDate, tasks, currentWeekNumber]);

  useEffect(() => {
    if (!isOpen || isListening || !spokenAnswer || intent?.type !== 'query') return;
    if (lastSpokenRef.current === spokenAnswer) return;
    lastSpokenRef.current = spokenAnswer;
    speakSpanish(spokenAnswer);
  }, [isOpen, isListening, spokenAnswer, intent]);

  const startListening = () => {
    setTranscript('');
    setIntent(null);
    setQueryTasks([]);
    setSpokenAnswer('');
    stopSpeaking();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpokenAnswer('Este navegador no permite reconocimiento de voz. Prueba en Chrome.');
      return;
    }

    try {
      recognitionRef.current?.stop?.();
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition not available:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const handleSelectPrompt = (prompt: string) => {
    setTranscript(prompt);
  };

  const handleConfirmTask = () => {
    if (!intent || intent.type !== 'add' || !intent.titleOk) return;
    onAddTask({
      title: intent.task.title,
      cadence: intent.task.cadence,
      dailyMode: intent.task.dailyMode,
      recurringPreset: intent.task.recurringPreset,
      recurringDays: intent.task.recurringDays,
      weeklyMode: intent.task.weeklyMode,
      priority: intent.task.priority,
      category: intent.task.category,
      dueDate: intent.task.dueDate,
      dueTime: intent.task.dueTime,
      location: intent.task.location,
      completed: false,
      weekNumber: intent.task.weekNumber || currentWeekNumber,
    });
    onClose();
  };

  const handleClose = () => {
    resetVoiceSession();
    onClose();
  };

  if (!isOpen) return null;

  const addIntent = intent?.type === 'add' ? intent : null;
  const queryIntent = intent?.type === 'query' ? intent : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto border border-[#e5e7eb] dark:border-[#262932] transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[18px]">mic</span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                Asistente de Voz Orbita
              </h3>
              <p className="text-[11px] text-[#444655] dark:text-[#9aa0a6]">
                Crea una tarea o pregunta qué tienes pendiente
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full text-[#757686] hover:bg-[#eceef0] dark:hover:bg-[#252831] flex items-center justify-center cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col items-center justify-center gap-4 text-center">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 cursor-pointer shadow-lg ${
              isListening
                ? 'bg-gradient-to-tr from-[#ba1a1a] to-[#ef4444] animate-pulse ring-8 ring-[#ffdad6] dark:ring-[#ba1a1a]/30'
                : 'bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] hover:shadow-[0_10px_28px_rgba(79,70,229,0.5)] ring-4 ring-[#dee0ff] dark:ring-[#4f46e5]/40'
            }`}
          >
            <span className="material-symbols-outlined text-[36px]">
              {isListening ? 'graphic_eq' : 'mic'}
            </span>
          </button>

          <p className="text-[13px] font-medium text-[#191c1e] dark:text-[#f3f4f6]">
            {isListening ? 'Escuchando tu voz...' : 'Toca el micrófono para hablar'}
          </p>

          {isListening && (
            <div className="flex items-center gap-1 h-6">
              {[40, 70, 100, 55, 80, 45, 90, 60, 30].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#4F46E5] rounded-full animate-bounce"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {transcript && (
          <div className="p-3 bg-[#e0f2fe]/40 dark:bg-[#0369a1]/20 rounded-xl border border-[#bae6fd] dark:border-[#0369a1]/40">
            <span className="text-[10px] font-bold text-[#0369A1] dark:text-[#38bdf8] uppercase tracking-wider block mb-1">
              Transcripción detectada:
            </span>
            <p className="text-[13px] text-[#191c1e] dark:text-[#f3f4f6] italic font-medium">"{transcript}"</p>
          </div>
        )}

        {queryIntent && (
          <div className="p-3.5 bg-white dark:bg-[#1f232b] rounded-xl border border-[#c5c5d8] dark:border-[#353945] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173bd0] dark:text-[#5675fd] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
                Pendientes {queryIntent.label}
              </span>
              <button
                type="button"
                onClick={() => spokenAnswer && speakSpanish(spokenAnswer)}
                className="text-[11px] font-semibold text-[#173bd0] dark:text-[#5675fd] flex items-center gap-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">volume_up</span>
                Escuchar
              </button>
            </div>
            <p className="text-[13px] text-[#191c1e] dark:text-[#f3f4f6]">{spokenAnswer}</p>
            {queryTasks.length > 0 && (
              <ul className="flex flex-col gap-1.5 pt-1">
                {queryTasks.map((task) => (
                  <li
                    key={task.id}
                    className="text-[12px] text-[#444655] dark:text-[#9aa0a6] flex items-start gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#173bd0] dark:text-[#5675fd]">
                      check_box_outline_blank
                    </span>
                    <span>
                      {task.title}
                      {task.dueTime ? ` · ${task.dueTime}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {addIntent && (
          <div className="p-3.5 bg-white dark:bg-[#1f232b] rounded-xl border border-[#c5c5d8] dark:border-[#353945] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173bd0] dark:text-[#5675fd] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                Tarea interpretada
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  addIntent.task.priority === 'Alta'
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-[#f2df99]/60 text-[#8a6508]'
                }`}
              >
                {addIntent.task.priority}
              </span>
            </div>

            {addIntent.titleOk ? (
              <p className="text-[14px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                {addIntent.task.title}
              </p>
            ) : (
              <p className="text-[13px] text-[#ba1a1a] dark:text-[#fca5a5]">
                No entendí el nombre de la tarea. Dime algo como: agrégame una tarea para mañana de comprar pan.
              </p>
            )}

            {addIntent.titleOk && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#444655] dark:text-[#9aa0a6]">
                <span className="px-2 py-0.5 rounded bg-[#dee0ff] dark:bg-[#173bd0]/30 text-[#00105b] dark:text-[#dee0ff] font-semibold">
                  {addIntent.task.dueDate}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#f2f4f6] dark:bg-[#252831]">
                  {addIntent.task.category}
                </span>
                {addIntent.task.dueTime && (
                  <span className="px-2 py-0.5 rounded bg-[#f2f4f6] dark:bg-[#252831] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {addIntent.task.dueTime}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {!transcript && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#757686]">
              Puedes decir, por ejemplo:
            </span>
            <div className="flex flex-col gap-1">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectPrompt(prompt)}
                  className="text-left px-3 py-1.5 bg-[#f8f9fb] dark:bg-[#1f232b] hover:bg-[#eceef0] dark:hover:bg-[#252831] rounded-xl text-[12px] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] transition-colors cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[#444655] dark:text-[#9aa0a6] font-semibold text-[13px] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer"
          >
            Cerrar
          </button>
          {queryIntent ? (
            <button
              onClick={() => spokenAnswer && speakSpanish(spokenAnswer)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1 bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">volume_up</span>
              Escuchar de nuevo
            </button>
          ) : (
            <button
              onClick={handleConfirmTask}
              disabled={!addIntent?.titleOk}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1 transition-all ${
                addIntent?.titleOk
                  ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] shadow-sm cursor-pointer'
                  : 'bg-[#eceef0] dark:bg-[#252831] text-[#757686] cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              Crear tarea
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
