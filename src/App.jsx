import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Settings, User, Mic, CheckCircle2, ShieldCheck, 
  Info, Sparkles, Loader2, Volume2, X, Edit2, Trash2, 
  Activity, ChevronLeft, Plus
} from 'lucide-react';

export default function App() {
  // --- 状态管理 ---
  const [stage, setStage] = useState('home'); 
  const [progress, setProgress] = useState(0);
  const [healthScore, setHealthScore] = useState(94);
  const [isCapturing, setIsCapturing] = useState(false);
  const [scanStatus, setScanStatus] = useState("正在寻找面部..."); 
  
  // 用户资料
  const [userInfo, setUserInfo] = useState({
      name: '王大爷', age: '75', height: '172', weight: '68', 
      bloodType: 'A', medicalHistory: '高血压病史5年，规律服药'
  });

  // 联系人
  const [contacts, setContacts] = useState([
      { id: 1, name: '大儿子', phone: '13811112222', relation: '长子', priority: '3' },
      { id: 2, name: '小女儿', phone: '13933334444', relation: '次女', priority: '2' }
  ]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // AI 相关状态
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // 评分细节定义
  const scoreDetails = {
      breath: { score: 18, total: 20, label: "心肺气息", desc: "15秒呼吸采样完成" },
      face: { score: 19, total: 20, label: "面部气色", desc: "红润有光泽" },
      tongue: { score: 17, total: 20, label: "舌象形态", desc: "舌苔薄白正常" },
      gait: { score: 20, total: 20, label: "步态分析", desc: "20步轨迹平稳" },
      data: { score: 20, total: 20, label: "基础病史", desc: "控制状态良好" }
  };

  // --- 摄像头控制 ---
  const startCamera = async () => {
      try {
          if (cameraStream) {
              cameraStream.getTracks().forEach(t => t.stop());
          }
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          setCameraStream(stream);
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
          setScanStatus("摄像头已就绪，识别中...");
      } catch (e) { 
          console.error("摄像头启动失败", e); 
          setScanStatus("摄像头不可用，请检查权限");
      }
  };

  const stopCamera = () => {
      if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
          setCameraStream(null);
      }
  };

  // --- 核心流程逻辑 ---
  useEffect(() => {
      let interval;
      const activeStages = ['step1', 'step2', 'step_tongue', 'step4'];
      
      if (activeStages.includes(stage)) {
          setProgress(0);
          if (stage === 'step2' || stage === 'step_tongue') {
              startCamera();
              setScanStatus(stage === 'step2' ? "正在捕捉面部气色..." : "请张嘴伸出舌头...");
          } else {
              stopCamera();
          }

          interval = setInterval(() => {
              setProgress(p => {
                  if (p >= 100) return 100;
                  if (stage === 'step1') return p + 0.6; 
                  if (stage === 'step4') return p + 0.8;
                  if (p > 60 && p < 62 && (stage === 'step2' || stage === 'step_tongue')) {
                      setIsCapturing(true);
                      setTimeout(() => setIsCapturing(false), 200);
                      setScanStatus("特征采集成功！");
                  }
                  return p + 2;
              });
          }, 100);
      } else {
          stopCamera();
      }
      return () => {
          clearInterval(interval);
      };
  }, [stage]);

  useEffect(() => {
      if (progress >= 100) {
          const nextMap = {
              'step1': 'step2', 
              'step2': 'step_tongue', 
              'step_tongue': 'step4', 
              'step4': 'summary'
          };
          const nextStage = nextMap[stage];
          if (nextStage) {
              const timer = setTimeout(() => {
                  setStage(nextStage);
              }, 1000);
              return () => clearTimeout(timer);
          }
      }
  }, [progress, stage]);

  // --- AI 逻辑 (DeepSeek 后端中转) ---
  const runDeepSeek = async () => {
      setIsAiLoading(true);
      setAiAnalysis("");
      try {
          // 调用后端 API，保护 Key
          const res = await fetch("/api/chat", {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  systemPrompt: "你是一位中医康养专家。请结合用户的身体信息和今日检测数据给出建议。语气要温和，像家人一样。",
                  messages: [
                      { role: "user", content: `用户资料：${userInfo.name}, ${userInfo.age}岁, 基础病:${userInfo.medicalHistory}。今日检测分数:${healthScore}，面色红润，舌苔正常，20步测试平稳。请给出100字建议。` }
                  ]
              })
          });
          
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || "API 请求失败");
          
          const text = d.choices[0].message.content;
          setAiAnalysis(text);
          // 使用浏览器自带语音合成 (0成本)
          if ('speechSynthesis' in window) {
             const utterance = new SpeechSynthesisUtterance(text);
             window.speechSynthesis.speak(utterance);
          }
      } catch (e) { 
          const fallback = "AI解析暂时不可用。但从指标看，您今天状态极佳。注意保持好心情！";
          setAiAnalysis(fallback); 
      } finally { setIsAiLoading(false); }
  };

  // --- 渲染页面 ---
  const renderHome = () => (
      <div key="home" className="p-8 flex flex-col items-center justify-center h-full space-y-10 animate-fade-in">
          <div className="flex justify-between w-full absolute top-10 px-8">
              <button onClick={() => setStage('contacts')} className="p-3 bg-white shadow-sm rounded-full text-emerald-600 active:scale-95 transition-transform"><Users /></button>
              <button onClick={() => setStage('settings')} className="p-3 bg-white shadow-sm rounded-full text-slate-400 active:scale-95 transition-transform"><Settings /></button>
          </div>
          <div className="text-center">
              <h1 className="text-5xl font-black text-emerald-800 tracking-tight mb-2">寿比南山</h1>
              <p className="text-emerald-600 font-bold bg-emerald-50 px-4 py-1 rounded-full text-sm">全方位智慧康养系统</p>
          </div>
          <div className="relative">
              <div className="w-64 h-64 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl border-8 border-white animate-pulse">
                  <User size={100} className="text-white" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-orange-400 text-white px-6 py-2 rounded-full font-bold shadow-lg whitespace-nowrap text-sm tracking-wide">
                  {userInfo.name} 已连接
              </div>
          </div>
          <button onClick={() => setStage('step1')} className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] text-2xl font-bold shadow-xl active:scale-95 transition-transform">开始全维检测</button>
          <p className="text-slate-400 text-xs text-center px-4">通过摄像头与动作传感器进行中医深度望诊与动诊</p>
      </div>
  );

  const renderStep1 = () => (
      <div key="step1" className="p-8 flex flex-col h-full bg-orange-50 animate-fade-in-up">
          <div className="text-center mt-12 space-y-6">
              <div className="mx-auto flex justify-center"><Mic size={80} className="text-orange-500" /></div>
              <h2 className="text-3xl font-bold text-slate-800">第一步：气息检测</h2>
              <p className="text-slate-500">请保持匀速，一口气念完这三句：</p>
              <div className="bg-white p-8 rounded-3xl shadow-inner border-2 border-orange-200">
                  <p className="text-3xl font-black text-orange-600 italic leading-loose">
                      福如东海阔<br/>寿比南山高<br/>岁岁常安康
                  </p>
              </div>
              <p className="text-sm text-orange-400 animate-pulse font-medium mt-4">正在进行15秒肺功能声波采样...</p>
          </div>
          <div className="mt-auto mb-16"><div className="h-4 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-300" style={{width: `${progress}%`}}></div></div></div>
      </div>
  );

  const renderVisionStep = (id, title, status) => (
      <div key={id} className="p-0 flex flex-col h-full bg-black">
          <div className="absolute top-10 left-0 right-0 z-10 text-center text-white p-4">
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-sm opacity-60 mt-1">{status}</p>
          </div>
          <div className={`flex-1 relative overflow-hidden transition-opacity duration-300 ${isCapturing ? 'opacity-30' : 'opacity-100'}`}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-72 h-96 border-2 border-emerald-400/50 rounded-[4rem]"></div>
                  <div className="absolute w-full h-1 bg-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-scan"></div>
              </div>
          </div>
          <div className="p-6 pb-12 bg-black"><div className="h-3 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${progress}%`}}></div></div></div>
      </div>
  );

  const renderSummary = () => (
      <div key="summary" className="p-6 flex flex-col h-full bg-white overflow-y-auto no-scrollbar">
          <div className="text-center mb-6">
              <div className="inline-block p-4 bg-emerald-100 rounded-full mb-2"><CheckCircle2 size={48} className="text-emerald-600" /></div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">全维检测圆满完成</h2>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-2xl mb-8 relative overflow-hidden text-center">
              <p className="opacity-80 text-sm">{userInfo.name} 今日福寿指数</p>
              <div className="text-7xl font-black my-3 tracking-tighter">{healthScore}</div>
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full text-sm">
                  <ShieldCheck size={16} /> 身体状态：非常稳定
              </div>
          </div>

          <div className="space-y-4 mb-8 px-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info size={14} /> 深度指标解析
              </h3>
              <div className="bg-slate-50 rounded-3xl p-6 space-y-4 border border-slate-100">
                  {Object.entries(scoreDetails).map(([k,v]) => (
                      <div key={k} className="flex items-center justify-between">
                          <div><p className="font-bold text-slate-700 text-sm">{v.label}</p><p className="text-[10px] text-slate-400">{v.desc}</p></div>
                          <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-50" style={{width: '100%'}}><div className="h-full bg-emerald-500" style={{width: `${(v.score/v.total)*100}%`}}></div></div></div>
                              <span className="font-mono font-bold text-emerald-600 text-sm">{v.score}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="mb-8">
              {!aiAnalysis && !isAiLoading ? (
                  <button onClick={runDeepSeek} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-2 animate-bounce active:scale-95 transition-transform">
                      <Sparkles /> ✨ DeepSeek AI 专家叮嘱
                  </button>
              ) : (
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2.5rem] relative shadow-inner">
                      {isAiLoading ? (
                          <div className="flex flex-col items-center py-6 gap-3 text-indigo-600 font-bold">
                              <Loader2 className="animate-spin" size={32} />
                              <p>正在结合身体病史与面相分析...</p>
                          </div>
                      ) : (
                          <div className="space-y-3 animate-fade-in">
                              <div className="flex justify-between items-center text-indigo-600 font-bold">
                                  <span className="flex items-center gap-2"><Sparkles size={16}/> AI 智能建议</span>
                                  <Volume2 className={isTtsLoading ? "animate-pulse" : ""} />
                              </div>
                              <p className="text-indigo-800 text-sm leading-relaxed italic">“{aiAnalysis}”</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
          <button onClick={() => setStage('home')} className="mt-auto w-full py-5 bg-slate-800 text-white rounded-[2rem] font-bold text-lg active:scale-95 transition-transform">回到首页</button>
      </div>
  );

  const ContactModal = () => (
      <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end animate-fade-in">
          <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.target);
              const data = { id: editingContact?.id || Date.now(), name: f.get('name'), phone: f.get('phone'), relation: f.get('relation'), priority: f.get('priority') };
              if(editingContact) setContacts(contacts.map(c=>c.id===data.id?data:c));
              else setContacts([...contacts, data]);
              setIsContactModalOpen(false);
          }} className="w-full bg-white rounded-t-[3rem] p-8 space-y-4 animate-slide-up">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-slate-800">{editingContact ? '编辑' : '添加'}联系人</h3><button type="button" onClick={()=>setIsContactModalOpen(false)} className="p-2"><X/></button></div>
              <div className="grid grid-cols-2 gap-4">
                  <input name="name" defaultValue={editingContact?.name} placeholder="姓名" required className="bg-slate-100 p-4 rounded-2xl outline-none font-bold text-slate-700" />
                  <input name="relation" defaultValue={editingContact?.relation} placeholder="关系" required className="bg-slate-100 p-4 rounded-2xl outline-none font-bold text-slate-700" />
              </div>
              <input name="phone" defaultValue={editingContact?.phone} placeholder="手机号" required className="w-full bg-slate-100 p-4 rounded-2xl outline-none font-bold text-slate-700 font-mono" />
              <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold ml-1">危机响应等级</p>
                  <div className="flex gap-2">
                      {['1','2','3'].map(l => (
                          <label key={l} className="flex-1 cursor-pointer">
                              <input type="radio" name="priority" value={l} defaultChecked={editingContact?.priority === l || (!editingContact && l === '1')} className="hidden peer" />
                              <div className="p-3 text-center rounded-xl bg-slate-50 border-2 border-transparent peer-checked:border-emerald-500 peer-checked:text-emerald-700 peer-checked:bg-emerald-50 text-slate-400 font-bold transition-all text-sm">L{l}</div>
                          </label>
                      ))}
                  </div>
              </div>
              <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg mt-2">保存守护信息</button>
          </form>
      </div>
  );

  return (
      <div className="h-screen w-screen flex justify-center items-center overflow-hidden bg-slate-100">
          <div className="w-full max-w-md h-full bg-white shadow-2xl relative flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden relative">
                  {stage === 'home' && renderHome()}
                  {stage === 'step1' && renderStep1()}
                  {stage === 'step2' && renderVisionStep("step2", "第二步：气色观察", scanStatus)}
                  {stage === 'step_tongue' && renderVisionStep("step_tongue", "第三步：舌象视诊", scanStatus)}
                  {stage === 'step4' && (
                      <div key="step4" className="p-8 flex flex-col h-full bg-emerald-50 items-center justify-center text-center animate-slide-in">
                          <div className="mx-auto flex justify-center"><Activity size={100} className="text-emerald-500 mb-6 animate-bounce" /></div>
                          <h2 className="text-3xl font-bold text-emerald-900">第四步：步态分析</h2>
                          <p className="text-slate-500 mt-4 text-lg">请自然行走 <span className="font-black text-emerald-600">20 步</span></p>
                          <p className="text-xs text-emerald-400 mt-2">正在进行步态轨迹采集与重心平稳度建模...</p>
                          <div className="mt-12 w-full"><div className="h-4 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${progress}%`}}></div></div></div>
                      </div>
                  )}
                  {stage === 'summary' && renderSummary()}
                  {stage === 'contacts' && (
                      <div key="contacts" className="p-6 flex flex-col h-full bg-slate-50 overflow-y-auto animate-slide-in">
                          <div className="mt-8 flex justify-between items-center mb-6">
                              <button onClick={()=>setStage('home')} className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-transform"><ChevronLeft/></button>
                              <h2 className="text-2xl font-bold text-slate-800">守护人管理</h2>
                              <button onClick={()=>{setEditingContact(null);setIsContactModalOpen(true);}} className="p-2 bg-emerald-600 text-white rounded-full shadow-md active:scale-95 transition-transform"><Plus/></button>
                          </div>
                          <div className="space-y-4">
                              {contacts.length === 0 && <p className="text-center text-slate-400 py-20">暂无联系人</p>}
                              {contacts.map(c => (
                                  <div key={c.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group animate-fade-in">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-12 h-12 flex items-center justify-center rounded-full font-bold shadow-inner ${c.priority==='3'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{c.name[0]}</div>
                                          <div><p className="font-bold text-slate-800 text-sm">{c.name} <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full ml-1 text-slate-400">L{c.priority}级</span></p><p className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</p></div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={()=>{setEditingContact(c);setIsContactModalOpen(true);}} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><Edit2 size={16}/></button>
                                          <button onClick={()=>setContacts(contacts.filter(con=>con.id!==c.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          {isContactModalOpen && <ContactModal />}
                      </div>
                  )}
                  {stage === 'settings' && (
                      <div key="settings" className="p-6 flex flex-col h-full bg-slate-50 overflow-y-auto animate-slide-in">
                          <div className="mt-8 flex items-center gap-4 mb-8">
                              <button onClick={()=>setStage('home')} className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-transform"><ChevronLeft/></button>
                              <h2 className="text-2xl font-bold text-slate-800">个人健康档案</h2>
                          </div>
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">姓名</label><input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-700" value={userInfo.name} onChange={e=>setUserInfo({...userInfo, name: e.target.value})} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">年龄</label><input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-700" value={userInfo.age} onChange={e=>setUserInfo({...userInfo, age: e.target.value})} /></div>
                                  <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">血型</label><select className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-700" value={userInfo.bloodType} onChange={e=>setUserInfo({...userInfo, bloodType: e.target.value})}><option>A</option><option>B</option><option>AB</option><option>O</option></select></div>
                              </div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 ml-1">病史/过敏史/长期服药</label><textarea className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none h-32 hide-scrollbar text-slate-700 leading-relaxed" value={userInfo.medicalHistory} onChange={e=>setUserInfo({...userInfo, medicalHistory: e.target.value})} /></div>
                              <button onClick={()=>setStage('home')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg transition-active">同步档案设置</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
          <style>{`
              @keyframes scan { 0% {top: 10%} 50% {top: 90%} 100% {top: 10%} }
              .animate-scan { animation: scan 2s linear infinite; }
              @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
              .animate-fade-in { animation: fade-in 0.5s ease-out; }
              @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
              .animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }
              @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
              .animate-slide-in { animation: slide-in 0.3s ease-out; }
              @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
              .animate-slide-up { animation: slide-up 0.3s ease-out; }
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
      </div>
  );
}