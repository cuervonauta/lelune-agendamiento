import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  Sparkles, 
  Star, 
  Package, 
  MapPin, 
  Truck, 
  CheckCircle, 
  ShoppingBag, 
  Lock, 
  Database, 
  X,
  Phone,
  ShoppingCart,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  AlertCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  onSnapshot, 
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';

// --- 1. CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDouxxvj9RWplaFT6WKoDWPoHuSOnF2HEU",
  authDomain: "lelune-pedidos.firebaseapp.com",
  projectId: "lelune-pedidos",
  storageBucket: "lelune-pedidos.firebasestorage.app",
  messagingSenderId: "735167886556",
  appId: "1:735167886556:web:c42d69b0dccadb4a0af019"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. DATOS DE NEGOCIO ACTUALIZADOS ---
const KITS = [
  { id: 'esencial', name: 'Kit Esencial', price: 13990, desc: 'Identificación básica para útiles y ropa.' },
  { id: 'plus', name: 'Kit Plus', price: 23990, desc: 'Etiquetas + Termoformados + Llavero de regalo.' },
  { id: 'deluxe', name: 'Kit Deluxe', price: 34990, desc: 'Papelería completa, identificadores premium y sorpresas.' },
  { id: 'guaga', name: 'Kit Guaga', price: 21990, desc: 'Especial para las necesidades de los más pequeñitos.' },
  { id: 'ninguno', name: 'Sin Kit (Solo individuales)', price: 0, desc: 'Selecciona solo los productos que necesites abajo.' }
];

const INDIVIDUAL_PRODUCTS = [
  { id: 'vinilo', name: 'Etiquetas en vinilo (1 hoja)', price: 4500 },
  { id: 'waterproof', name: 'Etiquetas Waterproof (20 un)', price: 7000 },
  { id: 'textiles', name: 'Etiquetas textiles (12 un)', price: 6500 },
  { id: 'mochila', name: 'Identificador de Mochila', price: 6000 },
  { id: 'botella', name: 'Botella de agua', price: 10990 }
];

const DELIVERY_DATES = [
  { id: 1, label: "Entrega 1 (30 Ene)", detail: "FECHA CERRADA", closed: true },
  { id: 2, label: "Entrega 2 (13 Feb)", detail: "FECHA CERRADA", closed: true },
  { id: 3, label: "Entrega 3 (27 Feb)", detail: "Sujeto a Stock", closed: false, isUrgent: true },
  { id: 4, label: "Entrega 4 (13 Mar)", detail: "Temporada escolar", closed: false },
  { id: 5, label: "Entrega 5 (27 Mar)", detail: "POR CONFIRMAR", closed: true }
];

const COMMUNES_RM = ["Santiago", "Ñuñoa", "Providencia", "Las Condes", "Vitacura", "Lo Barnechea", "Maipú", "La Florida", "Peñalolén", "San Miguel", "La Reina", "Macul"];

// --- 3. COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [orders, setOrders] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    parentName: '', 
    phone: '', 
    studentName: '', 
    theme: '', 
    selectedKit: '', 
    selectedItems: [], 
    deliveryType: '', 
    commune: '', 
    street: '',
    houseNumber: '',
    receiverName: '',
    altPhone: '',
    deliveryDateId: ''
  });

  // Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        signInAnonymously(auth).catch((error) => console.error("Error Auth:", error));
      }
    });
    return () => unsubscribe();
  }, []);

  // Admin: Escuchar pedidos en tiempo real
  useEffect(() => {
    if (!user || !isAdminAuth) return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(list);
    }, (error) => console.error("Error en base de datos:", error));
    return () => unsubscribe();
  }, [user, isAdminAuth]);

  // Cálculos
  const totalAmount = useMemo(() => {
    let total = 0;
    const kit = KITS.find(k => k.id === formData.selectedKit);
    if (kit) total += kit.price;
    formData.selectedItems.forEach(itemId => {
      const item = INDIVIDUAL_PRODUCTS.find(p => p.id === itemId);
      if (item) total += item.price;
    });
    return total;
  }, [formData.selectedKit, formData.selectedItems]);

  const stats = useMemo(() => {
    // Solo contar ingresos de pedidos aceptados o completados
    const totalRevenue = orders
      .filter(o => o.status !== 'rechazado')
      .reduce((acc, curr) => acc + (curr.total || 0), 0);
      
    const kitStats = KITS.map(kit => ({
      name: kit.name,
      revenue: orders
        .filter(o => o.selectedKit === kit.id && o.status !== 'rechazado')
        .reduce((acc, curr) => acc + (curr.total || 0), 0)
    }));
    return { kitStats, totalRevenue };
  }, [orders]);

  // Navegación
  const next = () => { window.scrollTo(0, 0); setStep(s => s + 1); };
  const back = () => { setStep(s => s - 1); };

  const toggleItem = (itemId) => {
    setFormData(prev => {
      const isSelected = prev.selectedItems.includes(itemId);
      const newItems = isSelected 
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId];
      return { ...prev, selectedItems: newItems };
    });
  };

  const saveOrder = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const orderData = { 
        ...formData, 
        total: totalAmount, 
        status: 'pendiente',
        createdAt: Timestamp.now(),
        userId: user.uid 
      };
      
      await addDoc(collection(db, 'orders'), orderData);
      
      const kitName = KITS.find(k => k.id === formData.selectedKit)?.name || 'Ninguno';
      const itemsList = formData.selectedItems.length > 0 
        ? formData.selectedItems.map(id => INDIVIDUAL_PRODUCTS.find(p => p.id === id).name).join(", ")
        : "Ninguno";

      const addressFull = formData.deliveryType === 'envio' ? `${formData.street} ${formData.houseNumber}, ${formData.commune}` : 'Retiro en Local';
      const msg = `Hola Lelune! 🌙 Nuevo pedido:\n👤 Cliente: ${formData.parentName}\n🎒 Alumno: ${formData.studentName}\n📦 Kit: ${kitName}\n➕ Adicionales: ${itemsList}\n📍 Entrega: ${addressFull}\n💰 Total: $${totalAmount.toLocaleString('es-CL')}`;
      
      // Enviar al número de Lelune: +56950732322
      window.open(`https://wa.me/56950732322?text=${encodeURIComponent(msg)}`, '_blank');
      
      setStatusMessage({ type: 'success', text: '¡Pedido enviado!' });
      setStep(0);
      setFormData({ 
        parentName: '', phone: '', studentName: '', theme: '', 
        selectedKit: '', selectedItems: [], deliveryType: '', 
        commune: '', street: '', houseNumber: '', receiverName: '', altPhone: '', deliveryDateId: '' 
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (e) { 
      console.error(e);
      setStatusMessage({ type: 'error', text: 'Error al procesar pedido.' });
    }
    setLoading(false);
  };

  const handleAdminLogin = () => {
    if (adminPass === 'Lelune2026') { 
      setIsAdminAuth(true); 
    } else { 
      setStatusMessage({ type: 'error', text: 'Clave incorrecta.' }); 
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      // Si se rechaza, preparamos un mensaje cordial
      if (newStatus === 'rechazado') {
        const order = orders.find(o => o.id === orderId);
        const msg = `Hola ${order.parentName}! 🌙 Te escribimos de Lelune. Lamentamos informarte que no hemos podido aceptar tu pedido en este momento. Si tienes dudas, por favor contáctanos por aquí. ¡Muchas gracias!`;
        window.open(`https://wa.me/56${order.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#f8f7ff] text-gray-800 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-100 rounded-full blur-3xl opacity-40"></div>
      </div>

      {statusMessage && (
        <div className={`fixed top-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-bounce ${statusMessage.type === 'success' ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {statusMessage.text}
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_40px_100px_rgba(147,51,234,0.1)] overflow-hidden border border-white relative mb-8 transition-all duration-500">
        
        <div className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-300 h-3 w-full"></div>
        
        {step > 0 && (
          <div className="px-6 sm:px-10 pt-8 text-left">
            <div className="bg-gray-100 h-2 w-full rounded-full overflow-hidden">
              <div className="bg-purple-400 h-full transition-all duration-700" style={{ width: `${(step / 5) * 100}%` }}></div>
            </div>
            <div className="flex justify-between mt-4 items-center">
              <button onClick={back} className="text-gray-300 hover:text-purple-400 flex items-center gap-1 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-colors">
                <ChevronLeft size={16} /> Atrás
              </button>
              <span className="text-[10px] sm:text-xs font-black text-purple-200 uppercase tracking-widest">Paso {step} de 5</span>
            </div>
          </div>
        )}

        {/* --- STEPS --- */}
        {step === 0 && (
          <div className="p-8 sm:p-12 text-center">
            <div className="mb-8 flex justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-purple-600 font-sans">LeLune</span>
                  <span className="text-4xl sm:text-5xl animate-pulse">🌙</span>
                </div>
              </div>
            </div>
            <h1 className="text-xl font-extrabold text-gray-800 mb-4 tracking-tighter uppercase opacity-30">Temporada 2026</h1>
            <p className="text-gray-400 mb-12 text-base sm:text-lg font-medium leading-relaxed px-4">Etiquetas con <span className="text-purple-400 font-bold">magia</span> para que este regreso a clases sea inolvidable.</p>
            <button onClick={next} className="w-full py-6 bg-gradient-to-r from-purple-500 to-indigo-400 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-purple-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              Comenzar Pedido <ChevronRight size={24} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="p-8 sm:p-10 space-y-8 text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">¡Hola! ✨</h2>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Tu Nombre</label>
                <input type="text" placeholder="Ej: María Paz Silva" className="w-full p-5 sm:p-6 bg-gray-50 border-none rounded-3xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-200 outline-none" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">WhatsApp</label>
                <div className="flex items-center bg-gray-50 rounded-3xl shadow-sm focus-within:ring-2 focus-within:ring-purple-200 transition-all overflow-hidden pr-4">
                  <span className="pl-6 font-bold text-gray-400 text-base">+56</span>
                  <input type="text" placeholder="9 1234 5678" className="w-full p-5 sm:p-6 bg-transparent outline-none font-bold text-gray-700 text-base border-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
            </div>
            <button onClick={next} disabled={!formData.parentName || formData.phone.length < 8} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Siguiente</button>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 sm:p-10 space-y-8 text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">Personalización 🎒</h2>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Nombre en Etiquetas</label>
                <input type="text" placeholder="Ej: Mateo González A." className="w-full p-5 sm:p-6 bg-gray-50 border-none rounded-3xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-200 outline-none" value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Temática</label>
                <input type="text" placeholder="Ej: Bluey, Astronautas..." className="w-full p-5 sm:p-6 bg-gray-50 border-none rounded-3xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-200 outline-none" value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} />
              </div>
            </div>
            <button onClick={next} disabled={!formData.studentName || !formData.theme} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Elegir Productos</button>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 sm:p-10 space-y-6 text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">Tu Pedido 🎁</h2>
            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <section className="space-y-3">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] ml-2">1. Selecciona tu base</p>
                <div className="grid grid-cols-1 gap-3">
                  {KITS.map(k => (
                    <div key={k.id} onClick={() => setFormData({...formData, selectedKit: k.id})} className={`p-4 sm:p-5 border-2 rounded-[2rem] cursor-pointer transition-all ${formData.selectedKit === k.id ? 'border-purple-500 bg-purple-50 shadow-md scale-[1.01]' : 'border-gray-50 bg-white hover:border-purple-100'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-black text-sm sm:text-base ${formData.selectedKit === k.id ? 'text-purple-600' : 'text-gray-700'}`}>{k.name}</span>
                        {k.price > 0 && <span className="text-[9px] sm:text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-purple-100 text-purple-500">${k.price.toLocaleString()}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{k.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3 border-t border-gray-100 pt-6">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2">2. Agrega Adicionales ✨</p>
                <div className="grid grid-cols-1 gap-3">
                  {INDIVIDUAL_PRODUCTS.map(p => (
                    <div key={p.id} onClick={() => toggleItem(p.id)} className={`p-5 border-2 rounded-[1.8rem] cursor-pointer flex justify-between items-center transition-all ${formData.selectedItems.includes(p.id) ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-50 bg-white hover:border-indigo-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors ${formData.selectedItems.includes(p.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-200'}`}>
                          {formData.selectedItems.includes(p.id) && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-black opacity-60">${p.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center px-2">
               <span className="font-bold text-gray-400 text-sm">Total estimado:</span>
               <span className="font-black text-purple-600 text-2xl tracking-tighter">${totalAmount.toLocaleString()}</span>
            </div>
            <button onClick={next} disabled={!formData.selectedKit || (formData.selectedKit === 'ninguno' && formData.selectedItems.length === 0)} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Siguiente</button>
          </div>
        )}

        {step === 4 && (
          <div className="p-6 sm:p-10 space-y-6 text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">Entrega 🚚</h2>
            <div className="flex flex-row gap-4">
              <button onClick={() => setFormData({...formData, deliveryType: 'retiro', commune: '', street: '', houseNumber: '', receiverName: formData.parentName})} className={`flex-1 p-6 border-2 rounded-[2rem] flex flex-col items-center gap-2 font-black transition-all ${formData.deliveryType === 'retiro' ? 'border-purple-500 bg-purple-50 text-purple-600 shadow-md' : 'border-gray-50 text-gray-300 hover:border-purple-100'}`}>
                <MapPin size={24} /> <span className="text-sm">Retiro</span>
              </button>
              <button onClick={() => setFormData({...formData, deliveryType: 'envio'})} className={`flex-1 p-6 border-2 rounded-[2rem] flex flex-col items-center gap-2 font-black transition-all ${formData.deliveryType === 'envio' ? 'border-purple-500 bg-purple-50 text-purple-600 shadow-md' : 'border-gray-50 text-gray-300 hover:border-purple-100'}`}>
                <Truck size={24} /> <span className="text-sm">Envío</span>
              </button>
            </div>
            
            {formData.deliveryType === 'envio' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 outline-none shadow-sm" value={formData.commune} onChange={e => setFormData({...formData, commune: e.target.value})}>
                    <option value="">Comuna RM</option>
                    {COMMUNES_RM.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" placeholder="Calle / Pasaje" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 shadow-sm outline-none" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                </div>
                <input type="text" placeholder="N° Casa / Depto" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 shadow-sm outline-none" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} />
              </div>
            )}

            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Programada</p>
              <div className="grid grid-cols-1 gap-2 max-h-[25vh] overflow-y-auto pr-2 custom-scrollbar">
                {DELIVERY_DATES.map(d => (
                  <div key={d.id} onClick={() => !d.closed && setFormData({...formData, deliveryDateId: d.id})} className={`p-4 border-2 rounded-2xl flex items-center gap-4 transition-all ${d.closed ? 'opacity-40 grayscale cursor-not-allowed bg-gray-50' : formData.deliveryDateId == d.id ? 'border-purple-500 bg-purple-50 cursor-pointer shadow-sm' : 'border-gray-50 bg-white hover:border-purple-100 cursor-pointer'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 ${d.closed ? 'border-gray-300' : formData.deliveryDateId === d.id ? 'bg-purple-500 border-purple-500' : 'border-gray-200'}`}></div>
                    <div className="leading-none text-left flex-1">
                      <p className={`font-black text-sm ${d.closed ? 'text-gray-400' : 'text-gray-700'}`}>{d.label}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-tighter ${d.isUrgent ? 'text-red-500' : 'text-gray-400'}`}>{d.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={next} disabled={!formData.deliveryType || !formData.deliveryDateId || (formData.deliveryType === 'envio' && (!formData.commune || !formData.street || !formData.houseNumber))} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Ver Resumen</button>
          </div>
        )}

        {step === 5 && (
          <div className="p-8 sm:p-10 text-center text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 border-4 border-white shadow-lg"><CheckCircle size={32} /></div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-6 text-center">¡Casi listo! ✨</h2>
            <div className="bg-gray-50 p-6 sm:p-8 rounded-[2rem] text-left space-y-4 border border-gray-100 mb-8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] -rotate-12 pointer-events-none"><ShoppingBag size={120} /></div>
              <div className="relative z-10">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-left">Datos</p>
                <p className="font-black text-gray-700 text-lg leading-tight text-left">{formData.parentName} <span className="text-gray-300 mx-1">|</span> +56 {formData.phone}</p>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 mt-1 uppercase text-left">🎒 {formData.studentName}</p>
              </div>
              <div className="relative z-10 pt-4 border-t border-gray-200/50 text-left">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Pedido</p>
                <div className="space-y-2">
                  <p className="font-black text-purple-600 text-sm flex justify-between">
                    <span>• {KITS.find(k => k.id === formData.selectedKit)?.name}</span>
                    <span>${KITS.find(k => k.id === formData.selectedKit)?.price.toLocaleString()}</span>
                  </p>
                  {formData.selectedItems.map(id => (
                    <p key={id} className="font-bold text-gray-500 text-[10px] sm:text-[11px] flex justify-between ml-2">
                      <span>+ {INDIVIDUAL_PRODUCTS.find(p => p.id === id).name}</span>
                      <span>${INDIVIDUAL_PRODUCTS.find(p => p.id === id).price.toLocaleString()}</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-purple-100 flex justify-between items-end">
                <p className="font-black text-gray-800 text-xl">Total</p>
                <p className="font-black text-purple-500 text-3xl sm:text-4xl tracking-tighter">${totalAmount.toLocaleString()}</p>
              </div>
            </div>
            <button onClick={saveOrder} disabled={loading} className="w-full py-6 bg-green-500 text-white rounded-[2rem] font-black text-xl shadow-lg shadow-green-100 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-white/50 border-t-white rounded-full"></div> : <>Confirmar Pedido <ShoppingCart size={24} /></>}
            </button>
            <button onClick={() => setStep(4)} className="mt-6 text-gray-300 font-bold text-xs underline block w-full text-center hover:text-purple-400 transition-colors">Corregir datos</button>
          </div>
        )}
      </div>
      
      {/* Botón Admin */}
      <button onClick={() => setShowAdmin(true)} className="mt-8 text-gray-300 hover:text-purple-400 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest bg-white/50 px-6 py-2 rounded-full border border-white/50 backdrop-blur-sm">
        <Lock size={12} /> Administración
      </button>

      {/* MODAL ADMIN */}
      {showAdmin && (
        <div className="fixed inset-0 bg-gray-900/60 z-[110] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xl animate-in duration-300">
          <div className="bg-white rounded-[2rem] sm:rounded-[4rem] w-full max-w-7xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            <div className="p-6 sm:p-10 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Database size={20}/></div>
                <div><h3 className="text-lg sm:text-2xl font-black text-gray-800 leading-none">Panel Lelune</h3></div>
              </div>
              <button onClick={() => {setShowAdmin(false); setIsAdminAuth(false);}} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-red-500"><X size={28}/></button>
            </div>

            <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white">
              {!isAdminAuth ? (
                <div className="py-20 flex flex-col items-center gap-6 text-center max-w-xs mx-auto">
                  <input type="password" placeholder="Clave Admin" className="w-full p-6 border-2 border-gray-100 rounded-3xl text-center focus:border-purple-300 outline-none font-bold text-2xl" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}/>
                  <button onClick={handleAdminLogin} className="w-full py-5 bg-purple-500 text-white rounded-3xl font-black">Acceder</button>
                </div>
              ) : (
                <div className="space-y-10 pb-10 text-left">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-purple-100 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <TrendingUp size={24}/>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ingresos Totales</span>
                      </div>
                      <p className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mt-8">${stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="lg:col-span-2 bg-gray-50 p-8 rounded-[3rem] border border-gray-100">
                      <div className="flex items-center gap-2 mb-6"><BarChart3 size={18} className="text-purple-500"/><h4 className="font-black text-gray-800 text-lg text-left">Performance</h4></div>
                      <div className="space-y-4">
                        {stats.kitStats.map(s => (
                          <div key={s.name} className="space-y-1 text-left">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400"><span>{s.name}</span><span>${s.revenue.toLocaleString()}</span></div>
                            <div className="h-2 bg-white rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${stats.totalRevenue > 0 ? (s.revenue / stats.totalRevenue) * 100 : 0}%` }}></div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-left">
                    <h4 className="font-black text-gray-800 text-xl flex items-center gap-2 px-2 text-left"><Clock size={20} className="text-indigo-500"/> Pedidos Recientes</h4>
                    <div className="flex flex-col gap-4">
                      {orders.map(o => {
                        const isDeadlineSoon = DELIVERY_DATES.find(d => d.id === o.deliveryDateId)?.isUrgent;
                        return (
                          <div key={o.id} className={`w-full p-6 sm:p-8 rounded-[2.5rem] border transition-all flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between ${o.status === 'listo' ? 'bg-green-50/50 border-green-100' : o.status === 'rechazado' ? 'bg-red-50 opacity-60 border-red-100' : 'bg-white border-gray-100 hover:border-purple-200 shadow-sm'}`}>
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[10px] font-black text-gray-300 uppercase">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('es-CL') : 'Reciente'}</span>
                                {o.status === 'listo' && <span className="bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase">Completado</span>}
                                {o.status === 'aceptado' && <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase">Aceptado</span>}
                                {o.status === 'rechazado' && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase">Rechazado</span>}
                                {isDeadlineSoon && o.status === 'pendiente' && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase animate-pulse">Urgente</span>}
                              </div>
                              <p className="font-black text-gray-800 text-2xl leading-none text-left">{o.parentName}</p>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-left">
                                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5"><Star size={14} className="text-purple-400"/> {o.studentName}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5"><Package size={14} className="text-purple-400"/> {KITS.find(k => k.id === o.selectedKit)?.name || 'Personalizado'}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5"><MapPin size={14} className="text-purple-400"/> {o.deliveryType === 'envio' ? o.commune : 'Retiro'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6 w-full lg:w-auto">
                              <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</p>
                                <p className="font-black text-purple-600 text-3xl tracking-tighter leading-none mt-1">${o.total?.toLocaleString()}</p>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <a href={`https://wa.me/56${o.phone}`} target="_blank" className="flex-1 sm:flex-none p-4 bg-green-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100"><Phone size={14}/> WhatsApp</a>
                                
                                {o.status === 'pendiente' && (
                                  <>
                                    <button onClick={() => updateOrderStatus(o.id, 'aceptado')} className="flex-1 sm:flex-none p-4 bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                      <ThumbsUp size={14}/> Aceptar
                                    </button>
                                    <button onClick={() => updateOrderStatus(o.id, 'rechazado')} className="flex-1 sm:flex-none p-4 bg-red-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100">
                                      <ThumbsDown size={14}/> Rechazar
                                    </button>
                                  </>
                                )}

                                {o.status === 'aceptado' && (
                                  <button onClick={() => updateOrderStatus(o.id, 'listo')} className="flex-1 sm:flex-none p-4 bg-purple-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100">
                                    <CheckCircle2 size={14}/> Completar
                                  </button>
                                )}

                                {(o.status === 'listo' || o.status === 'rechazado') && (
                                  <button onClick={() => updateOrderStatus(o.id, 'pendiente')} className="flex-1 sm:flex-none p-4 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    Reabrir
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
