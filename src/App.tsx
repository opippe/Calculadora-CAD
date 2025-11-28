import React, { useState, useEffect } from 'react';
import type { FC, ChangeEvent, ReactNode } from 'react';
import { AlertTriangle, Activity, Calculator, Droplet, Clock, Info, CheckCircle, Scale, Syringe } from 'lucide-react';

// --- TYPE DEFINITIONS ---

interface InputState {
  weight: string;
  age: string;
  glucose: string;
  ph: string;
  hco3: string;
  na: string;
  k: string;
  isShock: boolean;
  gcs: number;
}

type Severity = 'Leve' | 'Moderada' | 'Grave';

type PotassiumStatus = 'critical_low' | 'high' | 'normal';

interface ResultsState {
  bolusVolume: number;
  maintenance24h: number;
  totalDeficitVol: number;
  totalHourlyRate: number;
  insulinDoseStandard: string;
  insulinDoseLow: string;
  correctedSodium: number;
  potassiumStatus: PotassiumStatus;
}

// --- COMPONENT PROPS ---

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

interface SectionTitleProps {
  icon: React.ElementType;
  title: string;
}

const SectionTitle: FC<SectionTitleProps> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 text-slate-800">
    <Icon className="w-6 h-6 text-blue-600" />
    <h2 className="text-xl font-bold">{title}</h2>
  </div>
);

interface ResultRowProps {
  label: string;
  value: string;
  subtext?: string;
  alert?: boolean;
}

const ResultRow: FC<ResultRowProps> = ({ label, value, subtext, alert }) => (
  <div className={`flex flex-col p-3 rounded-lg border ${alert ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
    <span className="text-sm text-slate-500 font-medium">{label}</span>
    <span className={`text-lg font-bold ${alert ? 'text-red-700' : 'text-slate-800'}`}>{value}</span>
    {subtext && <span className="text-xs text-slate-400 mt-1">{subtext}</span>}
  </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  // Estado do Paciente
  const [inputs, setInputs] = useState<InputState>({
    weight: '',
    age: '',
    glucose: '', // mg/dL
    ph: '',
    hco3: '',
    na: '',
    k: '',
    isShock: false,
    gcs: 15 // Glasgow
  });

  const [results, setResults] = useState<ResultsState | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);

  // Manipulação de inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Lógica de Cálculo baseada no PDF ISPAD 2022
  useEffect(() => {
    if (!inputs.weight || !inputs.glucose || !inputs.ph) {
      setResults(null);
      return;
    }

    const weight = parseFloat(inputs.weight);
    const glucose = parseFloat(inputs.glucose);
    const ph = parseFloat(inputs.ph);
    const hco3 = parseFloat(inputs.hco3) || 0;
    const na = parseFloat(inputs.na) || 135;
    const k = parseFloat(inputs.k) || 4.0;

    // 1. Determinar Severidade (Pág 838 do PDF)
    let currentSeverity: Severity = 'Leve';
    let dehydrationPercent = 0.05; // 5% default

    if (ph < 7.1 || hco3 < 5) {
      currentSeverity = 'Grave';
      dehydrationPercent = 0.10; // 10%
    } else if (ph < 7.2 || hco3 < 10) {
      currentSeverity = 'Moderada';
      dehydrationPercent = 0.07; // 7%
    }

    setSeverity(currentSeverity);

    // 2. Fluidos de Ressuscitação (Bolus)
    const bolusVolume = inputs.isShock ? weight * 20 : weight * 10;
    
    // 3. Manutenção (Holliday-Segar)
    let maintenance24h = 0;
    if (weight <= 10) {
      maintenance24h = weight * 100;
    } else if (weight <= 20) {
      maintenance24h = 1000 + ((weight - 10) * 50);
    } else {
      maintenance24h = 1500 + ((weight - 20) * 20);
    }

    // 4. Déficit de Fluido
    const totalDeficitVol = (weight * dehydrationPercent * 1000) - bolusVolume;
    
    const deficitHourlyRate = totalDeficitVol / 48;
    const maintenanceHourlyRate = maintenance24h / 24;
    const totalHourlyRate = deficitHourlyRate + maintenanceHourlyRate;

    // 5. Insulina
    const insulinDoseStandard = weight * 0.1;
    const insulinDoseLow = weight * 0.05;

    // 6. Sódio Corrigido
    const correctedSodium = na + 1.6 * ((glucose - 100) / 100);

    // 7. Status do Potássio
    let potassiumStatus: PotassiumStatus = 'normal';
    if (k < 3.0) {
      potassiumStatus = 'critical_low';
    } else if (k > 5.5) {
      potassiumStatus = 'high';
    }

    setResults({
      bolusVolume: Math.round(bolusVolume),
      maintenance24h: Math.round(maintenance24h),
      totalDeficitVol: Math.round(totalDeficitVol > 0 ? totalDeficitVol : 0),
      totalHourlyRate: Math.round(totalHourlyRate),
      insulinDoseStandard: insulinDoseStandard.toFixed(2),
      insulinDoseLow: insulinDoseLow.toFixed(2),
      correctedSodium: Math.round(correctedSodium),
      potassiumStatus: potassiumStatus
    });

  }, [inputs]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-blue-700 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8" />
            ISPAD 2022 Protocolo Digital
          </h1>
          <p className="text-blue-100 mt-2 text-sm">
            Ferramenta de suporte à decisão clínica para Cetoacidose Diabética (DKA)
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* Aviso Legal */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Atenção:</strong> Esta aplicação é um auxiliar baseada nas diretrizes ISPAD 2022. 
            Todas as decisões devem ser confirmadas clinicamente. O julgamento médico prevalece.
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <SectionTitle icon={Scale} title="Dados do Paciente" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Peso (kg)</label>
                <input 
                  type="number" 
                  name="weight"
                  value={inputs.weight}
                  onChange={handleChange}
                  placeholder="ex: 25"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Idade (anos)</label>
                <input 
                  type="number" 
                  name="age"
                  value={inputs.age}
                  onChange={handleChange}
                  placeholder="ex: 8"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="col-span-2 flex items-center gap-2 mt-2 p-3 bg-red-50 rounded border border-red-100">
                <input 
                  type="checkbox" 
                  name="isShock"
                  checked={inputs.isShock}
                  onChange={handleChange}
                  id="shock"
                  className="w-5 h-5 text-red-600 rounded" 
                />
                <label htmlFor="shock" className="text-sm font-bold text-red-700 cursor-pointer">
                  Sinais de Choque / Hipotensão?
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Activity} title="Laboratório Inicial" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Glicemia (mg/dL)</label>
                <input 
                  type="number" 
                  name="glucose"
                  value={inputs.glucose}
                  onChange={handleChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">pH Venoso</label>
                <input 
                  type="number" 
                  step="0.01"
                  name="ph"
                  value={inputs.ph}
                  onChange={handleChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">HCO3 (mmol/L)</label>
                <input 
                  type="number" 
                  name="hco3"
                  value={inputs.hco3}
                  onChange={handleChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Sódio (Na+)</label>
                <input 
                  type="number" 
                  name="na"
                  value={inputs.na}
                  onChange={handleChange}
                  placeholder="135"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-semibold text-slate-600">Potássio (K+)</label>
                <input 
                  type="number" 
                  step="0.1"
                  name="k"
                  value={inputs.k}
                  onChange={handleChange}
                  placeholder="4.0"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Resultados */}
        {results ? (
          <div className="space-y-6 animate-fade-in">
            {/* Classificação */}
            <div className="bg-indigo-900 text-white p-4 rounded-lg shadow flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold opacity-90">Classificação DKA</h3>
                <p className="text-2xl font-bold">{severity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-75">Sódio Corrigido</p>
                <p className="text-xl font-mono">{results.correctedSodium} mmol/L</p>
              </div>
            </div>

            {/* Passo 1: Fluidos Iniciais */}
            <Card className="border-l-4 border-l-blue-500">
              <SectionTitle icon={Droplet} title="1. Expansão Volêmica (Imediato)" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResultRow 
                  label="Volume do Bolus (0.9% NaCl)" 
                  value={`${results.bolusVolume} ml`} 
                  subtext={inputs.isShock ? "Administrar o mais rápido possível (Choque)" : "Administrar em 20-30 minutos"}
                />
                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Se a perfusão não melhorar, o bolus pode ser repetido.
                </div>
              </div>
            </Card>

            {/* Passo 2: Fluidos de Manutenção + Déficit */}
            <Card className="border-l-4 border-l-cyan-500">
              <SectionTitle icon={Clock} title="2. Reposição Hídrica (Próximas 48h)" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <ResultRow label="Manutenção (24h)" value={`${results.maintenance24h} ml`} />
                <ResultRow label="Déficit Restante" value={`${results.totalDeficitVol} ml`} subtext="Já descontado o bolus inicial" />
                <ResultRow 
                  label="Vazão da Bomba" 
                  value={`${results.totalHourlyRate} ml/hora`} 
                  subtext="Manutenção + Correção de Déficit (48h)"
                  alert={true}
                />
              </div>
              <p className="text-sm text-slate-500 italic">
                * Recomenda-se usar Soro Fisiológico 0.45% a 0.9%. Adicionar K+ conforme protocolo.
              </p>
            </Card>

            {/* Passo 3: Insulina */}
            <Card className="border-l-4 border-l-purple-500">
              <SectionTitle icon={Syringe} title="3. Insulinoterapia" />
              
              <div className="bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <strong>AGUARDAR:</strong> Iniciar insulina apenas 1 hora após o início da hidratação.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResultRow 
                  label="Dose Padrão (0.1 U/kg/h)" 
                  value={`${results.insulinDoseStandard} Unidades/hora`} 
                  subtext="Dose usual para DKA Grave/Moderada"
                />
                <ResultRow 
                  label="Dose Reduzida (0.05 U/kg/h)" 
                  value={`${results.insulinDoseLow} Unidades/hora`} 
                  subtext="Considerar se pH > 7.15 ou criança pequena"
                />
              </div>
            </Card>

            {/* Passo 4: Potássio */}
            <Card className="border-l-4 border-l-green-500">
              <SectionTitle icon={CheckCircle} title="4. Reposição de Potássio" />
              {results.potassiumStatus === 'critical_low' && (
                 <div className="bg-red-600 text-white p-4 rounded-lg mb-2 font-bold flex items-center gap-2">
                   <AlertTriangle className="w-6 h-6" />
                   CRÍTICO: K+ &lt; 3.0 mmol/L. NÃO INICIAR INSULINA. Repor K+ primeiro.
                 </div>
              )}
              {results.potassiumStatus === 'high' && (
                 <div className="bg-orange-100 text-orange-800 p-4 rounded-lg mb-2 font-medium">
                   K+ &gt; 5.5 mmol/L. Adiar reposição de potássio até que K+ caia ou haja diurese.
                 </div>
              )}
              {results.potassiumStatus === 'normal' && (
                 <div className="bg-green-50 text-green-800 p-4 rounded-lg mb-2 font-medium">
                   K+ entre 3.0 e 5.5. Iniciar reposição (40 mmol/L) junto com a fluidoterapia.
                 </div>
              )}
              <div className="mt-2 text-sm text-slate-600">
                Acompanhar ECG para alterações de onda T se resultado laboratorial demorar.
              </div>
            </Card>

          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            <Calculator className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Preencha os dados vitais acima para gerar o protocolo.</p>
          </div>
        )}
      </main>
    </div>
  );
}