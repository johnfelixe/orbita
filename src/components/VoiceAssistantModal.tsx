import React, { useState, useEffect, useRef } from 'react';
import { Task, Cadence, Priority, Category } from '../types';
import { getIsoWeekNumber } from '../utils/taskUtils';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  selectedDate: string;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  selectedDate,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedTask, setParsedTask] = useState<{
    title: string;
    cadence: Cadence;
    dailyMode?: 'SPECIFIC_DATE' | 'RECURRING';
    recurringPreset?: 'WEEKDAYS' | 'WEEKENDS' | 'EVERY_DAY' | 'CUSTOM';
    recurringDays?: number[];
    weeklyMode?: 'SPECIFIC_WEEK' | 'ALL_WEEKS';
    weekNumber?: number;
    priority: Priority;
    category: Category;
    dueTime?: string;
    dueDate: string;
    location?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  const examplePrompts = [
    'Reunión de diseño con equipo mañana a las 11:00 am prioridad alta',
    'Rutina de cardio en parque central el viernes 08:00 am',
    'Revisar arquitectura técnica de microservicios toda la semana',
    'Comprar insumos de oficina hoy a las 06:30 pm',
  ];

  // Natural language parser
  const parseVoiceInput = (text: string) => {
    if (!text.trim()) return null;

    const lower = text.toLowerCase();

    // Priority
    let priority: Priority = 'Media';
    if (lower.includes('alta') || lower.includes('urgente') || lower.includes('importante')) {
      priority = 'Alta';
    } else if (lower.includes('baja')) {
      priority = 'Baja';
    }

    // Cadence & Recurrence
    let cadence: Cadence = 'DIARIA';
    let dailyMode: 'SPECIFIC_DATE' | 'RECURRING' = 'SPECIFIC_DATE';
    let recurringPreset: 'WEEKDAYS' | 'WEEKENDS' | 'EVERY_DAY' | 'CUSTOM' | undefined = undefined;
    let recurringDays: number[] | undefined = undefined;
    let weeklyMode: 'SPECIFIC_WEEK' | 'ALL_WEEKS' | undefined = undefined;
    let weekNumber = getIsoWeekNumber(selectedDate);

    if (lower.includes('lunes a viernes')) {
      cadence = 'DIARIA';
      dailyMode = 'RECURRING';
      recurringPreset = 'WEEKDAYS';
      recurringDays = [1, 2, 3, 4, 5];
    } else if (lower.includes('fin de semana') || lower.includes('fines de semana')) {
      cadence = 'DIARIA';
      dailyMode = 'RECURRING';
      recurringPreset = 'WEEKENDS';
      recurringDays = [6, 7];
    } else if (lower.includes('todos los días') || lower.includes('diariamente')) {
      cadence = 'DIARIA';
      dailyMode = 'RECURRING';
      recurringPreset = 'EVERY_DAY';
      recurringDays = [1, 2, 3, 4, 5, 6, 7];
    } else if (lower.includes('todas las semanas')) {
      cadence = 'SEMANAL';
      weeklyMode = 'ALL_WEEKS';
    } else if (lower.includes('semana')) {
      cadence = 'SEMANAL';
      weeklyMode = 'SPECIFIC_WEEK';
      const weekMatch = lower.match(/semana\s*(\d{1,2})/);
      if (weekMatch) {
        weekNumber = parseInt(weekMatch[1], 10);
      }
    }

    // Category
    let category: Category = 'Trabajo';
    if (lower.includes('cardio') || lower.includes('gimnasio') || lower.includes('entrenar') || lower.includes('ejercicio') || lower.includes('salud')) {
      category = 'Salud';
    } else if (lower.includes('estudiar') || lower.includes('leer') || lower.includes('curso') || lower.includes('aprender')) {
      category = 'Estudio';
    } else if (lower.includes('comprar') || lower.includes('casa') || lower.includes('personal') || lower.includes('insumos')) {
      category = 'Personal';
    }

    // Time detection: e.g. "11:00 am", "08:00 am", "6:30 pm", "a las 10"
    let dueTime = '10:00 am';
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = timeMatch[2] || '00';
      const ampm = timeMatch[3].toLowerCase();
      dueTime = `${h}:${m} ${ampm}`;
    }

    // Location
    let location: string | undefined = undefined;
    if (lower.includes('parque central')) location = 'Parque Central';
    else if (lower.includes('sala ágora') || lower.includes('sala agora')) location = 'Sala Ágora';
    else if (lower.includes('oficina')) location = 'Oficina';

    // Clean title
    let title = text
      .replace(/prioridad\s+(alta|media|baja)/gi, '')
      .replace(/a las\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '')
      .replace(/lunes a viernes/gi, '')
      .replace(/fines de semana/gi, '')
      .replace(/todos los días/gi, '')
      .replace(/toda la semana/gi, '')
      .replace(/todas las semanas/gi, '')
      .trim();

    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    } else {
      title = text;
    }

    return {
      title,
      cadence,
      dailyMode,
      recurringPreset,
      recurringDays,
      weeklyMode,
      weekNumber,
      priority,
      category,
      dueTime,
      dueDate: selectedDate,
      location,
    };
  };

  useEffect(() => {
    if (transcript) {
      const parsed = parseVoiceInput(transcript);
      setParsedTask(parsed);
    }
  }, [transcript]);

  const startListening = () => {
    setTranscript('');
    setParsedTask(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onerror = () => {
          setIsListening(false);
          // Fallback simulation
          simulateSpeech();
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Speech recognition not available:', err);
      }
    }

    // Fallback simulation
    simulateSpeech();
  };

  const simulateSpeech = () => {
    setIsListening(true);
    const sample = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    let idx = 0;
    const interval = setInterval(() => {
      idx += 4;
      setTranscript(sample.slice(0, idx));
      if (idx >= sample.length) {
        clearInterval(interval);
        setIsListening(false);
      }
    }, 50);
  };

  const handleSelectPrompt = (prompt: string) => {
    setTranscript(prompt);
  };

  const handleConfirmTask = () => {
    if (!parsedTask) return;
    onAddTask({
      title: parsedTask.title,
      cadence: parsedTask.cadence,
      dailyMode: parsedTask.dailyMode,
      recurringPreset: parsedTask.recurringPreset,
      recurringDays: parsedTask.recurringDays,
      weeklyMode: parsedTask.weeklyMode,
      priority: parsedTask.priority,
      category: parsedTask.category,
      dueDate: parsedTask.dueDate,
      dueTime: parsedTask.dueTime,
      location: parsedTask.location,
      completed: false,
      weekNumber: parsedTask.weekNumber || getIsoWeekNumber(selectedDate),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto border border-[#e5e7eb] dark:border-[#262932] transition-colors">
        {/* Header */}
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
                Habla naturalmente para programar una tarea
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-[#757686] hover:bg-[#eceef0] dark:hover:bg-[#252831] flex items-center justify-center cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mic & Waveform Area */}
        <div className="p-6 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col items-center justify-center gap-4 text-center">
          <button
            onClick={isListening ? () => setIsListening(false) : startListening}
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

          {/* Animated Waveform */}
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

        {/* Live Transcript / Prompt */}
        {transcript && (
          <div className="p-3 bg-[#e0f2fe]/40 dark:bg-[#0369a1]/20 rounded-xl border border-[#bae6fd] dark:border-[#0369a1]/40">
            <span className="text-[10px] font-bold text-[#0369A1] dark:text-[#38bdf8] uppercase tracking-wider block mb-1">
              Transcripción detectada:
            </span>
            <p className="text-[13px] text-[#191c1e] dark:text-[#f3f4f6] italic font-medium">"{transcript}"</p>
          </div>
        )}

        {/* Extracted Details Preview */}
        {parsedTask && (
          <div className="p-3.5 bg-white dark:bg-[#1f232b] rounded-xl border border-[#c5c5d8] dark:border-[#353945] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#173bd0] dark:text-[#5675fd] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                Tarea interpretada
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  parsedTask.priority === 'Alta'
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-[#f2df99]/60 text-[#8a6508]'
                }`}
              >
                {parsedTask.priority}
              </span>
            </div>

            <p className="text-[14px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
              {parsedTask.title}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#444655] dark:text-[#9aa0a6]">
              <span className="px-2 py-0.5 rounded bg-[#dee0ff] dark:bg-[#173bd0]/30 text-[#00105b] dark:text-[#dee0ff] font-semibold">
                {parsedTask.cadence}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#f2f4f6] dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6]">
                {parsedTask.category}
              </span>
              {parsedTask.dueTime && (
                <span className="px-2 py-0.5 rounded bg-[#f2f4f6] dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6] flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  {parsedTask.dueTime}
                </span>
              )}
              {parsedTask.location && (
                <span className="px-2 py-0.5 rounded bg-[#f2f4f6] dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6] flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">location_on</span>
                  {parsedTask.location}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick prompt suggestions */}
        {!transcript && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#757686]">
              O prueba un comando de ejemplo:
            </span>
            <div className="flex flex-col gap-1">
              {examplePrompts.slice(0, 3).map((prompt, i) => (
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[#444655] dark:text-[#9aa0a6] font-semibold text-[13px] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmTask}
            disabled={!parsedTask}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1 transition-all ${
              parsedTask
                ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] shadow-sm cursor-pointer'
                : 'bg-[#eceef0] dark:bg-[#252831] text-[#757686] cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            Crear tarea
          </button>
        </div>
      </div>
    </div>
  );
};

