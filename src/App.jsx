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
  ThumbsDown,
  History,
  ClipboardList,
  Search,
  CreditCard,
  Info,
  User as UserIcon,
  School,
  GraduationCap,
  Palette,
  Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
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

// --- 2. DATOS DE NEGOCIO ---
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
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [orders, setOrders] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [adminTab, setAdminTab] = useState('activos'); 
  const [historyFilter, setHistoryFilter] = useState('todos'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  
  const [formData, setFormData] = useState({
    parentName: '', phone: '', studentName: '', theme: '', school: '', grade: '',
    selectedKit: '', selectedItems: [], paymentMethod: '', deliveryType: '', 
    commune: '', street: '', houseNumber: '', receiverName: '', altPhone: '', deliveryDateId: ''
  });

  // Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) signInAnonymously(auth).catch((error) => console.error("Error Auth:", error));
    });
    return () => unsubscribe();
  }, []);

  // Admin: Escuchar pedidos
  useEffect(() => {
    if (!user || !isAdminAuth) return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error base de datos:", error));
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
    const totalRevenue = orders.filter(o => o.status === 'listo').reduce((acc, curr) => acc + (curr.total || 0), 0);
    const kitStats = KITS.map(kit => ({
      name: kit.name,
      revenue: orders.filter(o => o.selectedKit === kit.id && o.status === 'listo').reduce((acc, curr) => acc + (curr.total || 0), 0)
    }));
    return { kitStats, totalRevenue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let baseList = adminTab === 'activos' 
      ? orders.filter(o => o.status === 'pendiente' || o.status === 'aceptado')
      : orders.filter(o => o.status === 'listo' || o.status === 'rechazado');

    if (adminTab === 'historial' && historyFilter !== 'todos') {
      baseList = baseList.filter(o => o.status === historyFilter);
    }

    if (searchTerm.trim() !== '') {
      const lowSearch = searchTerm.toLowerCase();
      baseList = baseList.filter(o => 
        o.parentName?.toLowerCase().includes(lowSearch) ||
        o.studentName?.toLowerCase().includes(lowSearch) ||
        o.phone?.includes(searchTerm) ||
        o.theme?.toLowerCase().includes(lowSearch) ||
        o.school?.toLowerCase().includes(lowSearch)
      );
    }
    return baseList;
  }, [orders, adminTab, historyFilter, searchTerm]);

  // Navegación
  const next = () => { window.scrollTo(0, 0); setStep(s => s + 1); };
  const back = () => { setStep(s => s - 1); };

  const toggleItem = (itemId) => {
    setFormData(prev => {
      const isSelected = prev.selectedItems.includes(itemId);
      return { ...prev, selectedItems: isSelected ? prev.selectedItems.filter(id => id !== itemId) : [...prev.selectedItems, itemId] };
    });
  };

  const saveOrder = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const orderData = { ...formData, total: totalAmount, status: 'pendiente', createdAt: Timestamp.now(), userId: user.uid };
      await addDoc(collection(db, 'orders'), orderData);
      const kitName = KITS.find(k => k.id === formData.selectedKit)?.name || 'Ninguno';
      const addressFull = formData.deliveryType === 'envio' ? `${formData.street} ${formData.houseNumber}, ${formData.commune}` : 'Retiro en Local';
      let msg = `Hola Lelune! 🌙 Nuevo pedido:\n👤 Cliente: ${formData.parentName}\n🎒 Alumno: ${formData.studentName}\n🎨 Temática: ${formData.theme}`;
      if (formData.school) msg += `\n🏫 Colegio: ${formData.school}`;
      if (formData.grade) msg += `\n🎓 Grado: ${formData.grade}`;
      msg += `\n📦 Kit: ${kitName}\n💳 Pago: ${formData.paymentMethod}\n📍 Entrega: ${addressFull}\n💰 Total: $${totalAmount.toLocaleString('es-CL')}`;
      window.open(`https://wa.me/56950732322?text=${encodeURIComponent(msg)}`, '_blank');
      setStatusMessage({ type: 'success', text: '¡Solicitud enviada!' });
      setStep(0);
      setFormData({ parentName: '', phone: '', studentName: '', theme: '', school: '', grade: '', selectedKit: '', selectedItems: [], paymentMethod: '', deliveryType: '', commune: '', street: '', houseNumber: '', receiverName: '', altPhone: '', deliveryDateId: '' });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (e) { setStatusMessage({ type: 'error', text: 'Error al procesar pedido.' }); }
    setLoading(false);
  };

  const handleAdminLogin = () => {
    if (adminUser === 'leluneadminCS' && adminPass === 'Lelune2026') setIsAdminAuth(true);
    else { setStatusMessage({ type: 'error', text: 'Credenciales incorrectas.' }); setTimeout(() => setStatusMessage(null), 3000); }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      const order = orders.find(o => o.id === orderId);

      if (newStatus === 'rechazado') {
        const msg = `Hola ${order.parentName}! 🌙 Te escribimos de Lelune. Lamentamos informarte que no hemos podido procesar tu solicitud en este momento. Si tienes dudas, contáctanos. ¡Muchas gracias!`;
        window.open(`https://wa.me/56${order.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      if (newStatus === 'aceptado') {
        const amount = (order.total * 0.5).toLocaleString('es-CL');
        const msg = order.paymentMethod === 'mercado_pago' 
          ? `¡Hola ${order.parentName}! ✨ Tu solicitud en Lelune ha sido APROBADA. 🎒\n\nPara comenzar con la magia, puedes realizar el pago del 50% ($${amount}) en el siguiente link:\n👉 https://link.mercadopago.cl/lelunecl\n\nUna vez realizado, envíanos el comprobante por aquí. ¡Gracias! 🌙`
          : `¡Hola ${order.parentName}! ✨ Tu solicitud en Lelune ha sido APROBADA. 🎒\n\nPara comenzar con la magia, necesitamos el pago del 50% ($${amount}) vía transferencia. Por favor confírmanos por aquí para enviarte los datos de cuenta. ¡Gracias! 🌙`;
        window.open(`https://wa.me/56${order.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (e) { console.error(e); }
  };

  const clearHistory = async () => {
    setLoading(true);
    try {
      const historyItems = orders.filter(o => o.status === 'listo' || o.status === 'rechazado');
      for (const item of historyItems) {
        await deleteDoc(doc(db, 'orders', item.id));
      }
      setShowClearModal(false);
      setStatusMessage({ type: 'success', text: 'Historial limpiado correctamente.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f7ff] text-gray-800 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden">
      
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-100 rounded-full blur-3xl opacity-40"></div>
      </div>

      {statusMessage && (
        <div className={`fixed top-6 z-[120] px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-bounce ${statusMessage.type === 'success' ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'}`}>
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
              <div className="bg-purple-400 h-full transition-all duration-700" style={{ width: `${(step / 6) * 100}%` }}></div>
            </div>
            <div className="flex justify-between mt-4 items-center text-left">
              <button onClick={back} className="text-gray-300 hover:text-purple-400 flex items-center gap-1 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-colors">
                <ChevronLeft size={16} /> Atrás
              </button>
              <span className="text-[10px] sm:text-xs font-black text-purple-200 uppercase tracking-widest text-left">Paso {step} de 6</span>
            </div>
          </div>
        )}

        {/* --- CLIENT STEPS --- */}
        {step === 0 && (
          <div className="p-8 sm:p-12 text-center animate-in">
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
          <div className="p-8 sm:p-10 space-y-8 text-left animate-in">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight text-left">¡Hola! ✨</h2>
            <div className="space-y-6 text-left">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-left">Tu Nombre</label>
                <input type="text" placeholder="Ej: María Paz Silva" className="w-full p-5 sm:p-6 bg-gray-50 border-none rounded-3xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-200 outline-none" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-left">WhatsApp</label>
                <div className="flex items-center bg-gray-50 rounded-3xl shadow-sm focus-within:ring-2 focus-within:ring-purple-200 transition-all overflow-hidden pr-4 text-left">
                  <span className="pl-6 font-bold text-gray-400 text-base">+56</span>
                  <input type="text" placeholder="9 1234 5678" className="w-full p-5 sm:p-6 bg-transparent outline-none font-bold text-gray-700 text-base border-none text-left" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
            </div>
            <button onClick={next} disabled={!formData.parentName || formData.phone.length < 8} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Siguiente</button>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 sm:p-10 space-y-8 text-left animate-in">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight text-left">Personalización 🎒</h2>
            <div className="space-y-5 text-left">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-left">Nombre en Etiquetas</label>
                <input type="text" placeholder="Ej: Mateo González A." className="w-full p-5 bg-gray-50 border-none rounded-3xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-200 outline-none text-left" value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-left">Temática</label>
                <input type="text" placeholder="Ej: Bluey, Astronautas..." className="w-full p-5 bg-gray-50 border-none rounded-3xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-200 outline-none text-left" value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} />
              </div>
              <div className="space-y-4 pt-4 border-t border-gray-100 text-left">
                <div className="flex items-center gap-2 mb-2 text-left">
                   <Info size={14} className="text-purple-400"/>
                   <p className="text-[10px] font-bold text-gray-400 leading-tight text-left">Nota: Si no incluyes el colegio o grado, esta información no aparecerá en tus etiquetas.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-left text-left">Colegio (Opcional)</label>
                    <input type="text" placeholder="Ej: Lincoln" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-100 outline-none text-left" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block text-left text-left">Grado (Opcional)</label>
                    <input type="text" placeholder="Ej: 2° Básico B" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-purple-100 outline-none text-left" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={next} disabled={!formData.studentName || !formData.theme} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Elegir Productos</button>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 sm:p-10 space-y-6 text-left animate-in">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight text-left">Tu Pedido 🎁</h2>
            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar text-left">
              <section className="space-y-3 text-left">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] ml-2 text-left">1. Selecciona tu base</p>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {KITS.map(k => (
                    <div key={k.id} onClick={() => setFormData({...formData, selectedKit: k.id})} className={`p-4 sm:p-5 border-2 rounded-[2rem] cursor-pointer transition-all ${formData.selectedKit === k.id ? 'border-purple-500 bg-purple-50 shadow-md scale-[1.01]' : 'border-gray-50 bg-white hover:border-purple-100'}`}>
                      <div className="flex justify-between items-center mb-1 text-left">
                        <span className={`font-black text-sm sm:text-base ${formData.selectedKit === k.id ? 'text-purple-600' : 'text-gray-700'}`}>{k.name}</span>
                        {k.price > 0 && <span className="text-[9px] sm:text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-purple-100 text-purple-500">${k.price.toLocaleString()}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold leading-relaxed text-left">{k.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="space-y-3 border-t border-gray-100 pt-6 text-left">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2 text-left">2. Agrega Adicionales ✨</p>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {INDIVIDUAL_PRODUCTS.map(p => (
                    <div key={p.id} onClick={() => toggleItem(p.id)} className={`p-5 border-2 rounded-[1.8rem] cursor-pointer flex justify-between items-center transition-all ${formData.selectedItems.includes(p.id) ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-50 bg-white hover:border-indigo-100'}`}>
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors ${formData.selectedItems.includes(p.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-200'}`}>
                          {formData.selectedItems.includes(p.id) && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-left">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-black opacity-60 text-left">${p.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center px-2 text-left">
               <span className="font-bold text-gray-400 text-sm text-left">Total estimado:</span>
               <span className="font-black text-purple-600 text-2xl tracking-tighter text-left">${totalAmount.toLocaleString()}</span>
            </div>
            <button onClick={next} disabled={!formData.selectedKit || (formData.selectedKit === 'ninguno' && formData.selectedItems.length === 0)} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all">Siguiente</button>
          </div>
        )}

        {step === 4 && (
          <div className="p-8 sm:p-10 space-y-8 text-left animate-in">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight text-left">Medio de Pago 💳</h2>
            <div className="grid grid-cols-1 gap-4 text-left">
              <button onClick={() => setFormData({...formData, paymentMethod: 'transferencia'})} className={`p-6 border-2 rounded-[2rem] flex items-center gap-4 transition-all ${formData.paymentMethod === 'transferencia' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-50 bg-white hover:border-purple-100'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.paymentMethod === 'transferencia' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}><ClipboardList size={20}/></div>
                <div className="text-left"><p className="font-black text-gray-700 text-left">Transferencia</p><p className="text-[10px] text-gray-400 font-bold text-left">Coordina los datos tras la aprobación</p></div>
              </button>
              <button onClick={() => setFormData({...formData, paymentMethod: 'mercado_pago'})} className={`p-6 border-2 rounded-[2rem] flex items-center gap-4 transition-all ${formData.paymentMethod === 'mercado_pago' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-50 bg-white hover:border-blue-100'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.paymentMethod === 'mercado_pago' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}><CreditCard size={20}/></div>
                <div className="text-left"><p className="font-black text-gray-700 text-left">Mercado Pago</p><p className="text-[10px] text-gray-400 font-bold text-left">Link de pago tras la aprobación</p></div>
              </button>
            </div>
            <button onClick={next} disabled={!formData.paymentMethod} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 active:scale-[0.98] transition-all">Siguiente</button>
          </div>
        )}

        {step === 5 && (
          <div className="p-6 sm:p-10 space-y-6 text-left animate-in">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight text-left">Entrega 🚚</h2>
            <div className="flex flex-row gap-4 text-left">
              <button onClick={() => setFormData({...formData, deliveryType: 'retiro', commune: '', street: '', houseNumber: '', receiverName: formData.parentName})} className={`flex-1 p-6 border-2 rounded-[2rem] flex flex-col items-center gap-2 font-black transition-all ${formData.deliveryType === 'retiro' ? 'border-purple-500 bg-purple-50 text-purple-600 shadow-md' : 'border-gray-50 text-gray-300 hover:border-purple-100'}`}>
                <MapPin size={24} /> <span className="text-sm">Retiro</span>
              </button>
              <button onClick={() => setFormData({...formData, deliveryType: 'envio'})} className={`flex-1 p-6 border-2 rounded-[2rem] flex flex-col items-center gap-2 font-black transition-all ${formData.deliveryType === 'envio' ? 'border-purple-500 bg-purple-50 text-purple-600 shadow-md' : 'border-gray-50 text-gray-300 hover:border-purple-100'}`}>
                <Truck size={24} /> <span className="text-sm">Envío</span>
              </button>
            </div>
            {formData.deliveryType === 'retiro' && (
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex gap-4 animate-in text-left">
                <Info size={24} className="text-blue-500 shrink-0 mt-1"/>
                <p className="text-sm font-bold text-blue-700 leading-relaxed text-left">Podrás retirar tu pedido en el punto de entrega que te indicaremos de manera personalizada a través de WhatsApp una vez que el pedido esté listo.</p>
              </div>
            )}
            {formData.deliveryType === 'envio' && (
              <div className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 outline-none shadow-sm text-left" value={formData.commune} onChange={e => setFormData({...formData, commune: e.target.value})}>
                    <option value="">Comuna RM</option>
                    {COMMUNES_RM.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" placeholder="Calle / Pasaje" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 shadow-sm outline-none text-left" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                </div>
                <input type="text" placeholder="N° Casa / Depto" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 shadow-sm outline-none text-left" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} />
              </div>
            )}
            <div className="space-y-2 pt-2 text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-left block">Fecha Programada</p>
              <div className="grid grid-cols-1 gap-2 max-h-[25vh] overflow-y-auto pr-2 custom-scrollbar text-left">
                {DELIVERY_DATES.map(d => (
                  <div key={d.id} onClick={() => !d.closed && setFormData({...formData, deliveryDateId: d.id})} className={`p-4 border-2 rounded-2xl flex items-center gap-4 transition-all ${d.closed ? 'opacity-40 grayscale cursor-not-allowed bg-gray-50' : formData.deliveryDateId == d.id ? 'border-purple-500 bg-purple-50 cursor-pointer shadow-sm' : 'border-gray-50 bg-white hover:border-purple-100 cursor-pointer'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 ${d.closed ? 'border-gray-300' : formData.deliveryDateId === d.id ? 'bg-purple-500 border-purple-500' : 'border-gray-200'}`}></div>
                    <div className="leading-none text-left flex-1 text-left">
                      <p className={`font-black text-sm text-left ${d.closed ? 'text-gray-400' : 'text-gray-700'}`}>{d.label}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-tighter text-left ${d.isUrgent ? 'text-red-500' : 'text-gray-400'}`}>{d.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={next} disabled={!formData.deliveryType || !formData.deliveryDateId || (formData.deliveryType === 'envio' && (!formData.commune || !formData.street || !formData.houseNumber))} className="w-full py-6 bg-purple-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 disabled:opacity-30 active:scale-[0.98] transition-all text-left">Ver Resumen</button>
          </div>
        )}

        {step === 6 && (
          <div className="p-8 sm:p-10 text-center text-left animate-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 border-4 border-white shadow-lg text-left"><CheckCircle size={32} /></div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-6 text-center text-left">Resumen de tu solicitud ✨</h2>
            <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl mb-8 text-left">
              <p className="text-xs font-bold text-orange-800 leading-relaxed italic text-left">* Importante: Para poder aceptar el pedido debe pagarse el 50% del total mediante el medio de pago señalado. Una vez enviada la solicitud, recibiremos la notificación, validaremos stock y te enviaremos el link o datos de pago por WhatsApp para confirmar.</p>
            </div>
            <div className="bg-gray-50 p-6 sm:p-8 rounded-[2rem] text-left space-y-4 border border-gray-100 mb-8 relative overflow-hidden shadow-sm text-left">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] -rotate-12 pointer-events-none text-left"><ShoppingBag size={120} /></div>
              <div className="relative z-10 space-y-4 text-left">
                <div className="text-left"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 text-left">Datos de Contacto</p><p className="font-black text-gray-700 text-lg leading-tight text-left">{formData.parentName} <span className="text-gray-300 mx-1">|</span> +56 {formData.phone}</p></div>
                <div className="pt-4 border-t border-gray-200/50 text-left">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 text-left">Personalización</p>
                  <div className="space-y-1.5 text-left">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2 text-left"><UserIcon size={14} className="text-purple-400 text-left"/> 🎒 {formData.studentName}</p>
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2 text-left"><Palette size={14} className="text-purple-400 text-left"/> 🎨 {formData.theme}</p>
                    {formData.school && <p className="text-sm font-bold text-gray-700 flex items-center gap-2 text-left"><School size={14} className="text-purple-400 text-left"/> 🏫 {formData.school}</p>}
                    {formData.grade && <p className="text-sm font-bold text-gray-700 flex items-center gap-2 text-left"><GraduationCap size={14} className="text-purple-400 text-left"/> 🎓 {formData.grade}</p>}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200/50 text-left">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 text-left">Tu Pedido</p>
                  <div className="space-y-2 text-left">
                    <p className="font-black text-purple-600 text-sm flex justify-between text-left"><span>• {KITS.find(k => k.id === formData.selectedKit)?.name}</span><span>${KITS.find(k => k.id === formData.selectedKit)?.price.toLocaleString()}</span></p>
                    {formData.selectedItems.map(id => (<p key={id} className="font-bold text-gray-500 text-[10px] sm:text-[11px] flex justify-between ml-2 text-left"><span>+ {INDIVIDUAL_PRODUCTS.find(p => p.id === id).name}</span><span>${INDIVIDUAL_PRODUCTS.find(p => p.id === id).price.toLocaleString()}</span></p>))}
                    <p className="font-bold text-blue-600 text-xs mt-2 border-t border-blue-100 pt-2 flex justify-between text-left"><span>💳 Pago elegido:</span><span className="uppercase text-left">{formData.paymentMethod === 'transferencia' ? 'Transferencia' : 'Mercado Pago'}</span></p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-purple-100 flex justify-between items-end text-left"><p className="font-black text-gray-800 text-xl text-left">Total</p><p className="font-black text-purple-500 text-3xl sm:text-4xl tracking-tighter text-left">${totalAmount.toLocaleString()}</p></div>
            </div>
            <button onClick={saveOrder} disabled={loading} className="w-full py-6 bg-[#8e24aa] text-white rounded-[2rem] font-black text-xl shadow-lg shadow-purple-100 active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-left">
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-white/50 border-t-white rounded-full text-left"></div> : <>Enviar Solicitud <ShoppingCart size={24} /></>}
            </button>
            <button onClick={() => setStep(5)} className="mt-6 text-gray-300 font-bold text-xs underline block w-full text-center hover:text-purple-400 transition-colors text-left text-center">Corregir datos</button>
          </div>
        )}
      </div>
      
      {/* Admin Toggle */}
      <button onClick={() => setShowAdmin(true)} className="mt-8 text-gray-300 hover:text-purple-400 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest bg-white/50 px-6 py-2 rounded-full border border-white/50 backdrop-blur-sm text-left">
        <Lock size={12} /> Administración
      </button>

      {/* MODAL ADMIN */}
      {showAdmin && (
        <div className="fixed inset-0 bg-gray-900/60 z-[110] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xl animate-in duration-300 text-left">
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] w-full max-w-7xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl relative text-left">
            
            <div className="p-4 sm:p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 text-left">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg text-left"><Database size={20}/></div>
                <div className="text-left"><h3 className="text-lg sm:text-2xl font-black text-gray-800 leading-none text-left">Panel Lelune</h3></div>
              </div>
              
              {isAdminAuth && (
                <div className="flex bg-gray-200/50 p-1 rounded-2xl w-full sm:w-auto text-left">
                  <button onClick={() => setAdminTab('activos')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-left ${adminTab === 'activos' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><ClipboardList size={14}/> Activos</button>
                  <button onClick={() => setAdminTab('historial')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-left ${adminTab === 'historial' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><History size={14}/> Historial</button>
                </div>
              )}

              <button onClick={() => {setShowAdmin(false); setIsAdminAuth(false); setAdminUser(''); setAdminPass('');}} className="absolute top-4 right-4 sm:static p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 text-left"><X size={28}/></button>
            </div>

            <div className="p-4 sm:p-10 overflow-y-auto flex-1 bg-white text-left text-left">
              {!isAdminAuth ? (
                <div className="py-10 flex flex-col items-center gap-6 text-center max-w-xs mx-auto text-left">
                  <div className="w-full space-y-4 text-left">
                    <div className="space-y-1 text-left"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left text-left">Usuario</label><input type="text" placeholder="Usuario Admin" className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-300 outline-none font-bold text-left" value={adminUser} onChange={e => setAdminUser(e.target.value)}/></div>
                    <div className="space-y-1 text-left text-left"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left text-left">Contraseña</label><input type="password" placeholder="Clave Admin" className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-300 outline-none font-bold text-left text-left" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}/></div>
                  </div>
                  <button onClick={handleAdminLogin} className="w-full py-5 bg-purple-500 text-white rounded-3xl font-black shadow-lg shadow-purple-100 text-left">Acceder al Sistema</button>
                </div>
              ) : (
                <div className="space-y-10 pb-10 text-left text-left text-left">
                  {adminTab === 'historial' && (
                    <div className="flex flex-col sm:flex-row gap-4 text-left">
                       <div className="relative group text-left flex-1">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-purple-500 transition-colors text-left" size={20}/>
                          <input type="text" placeholder="Busca por nombre, temática, colegio, celular o kit..." className="w-full p-6 pl-16 bg-gray-50 border-none rounded-[2.5rem] font-bold text-gray-700 outline-none shadow-inner focus:ring-4 focus:ring-purple-100 transition-all text-left" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                       </div>
                       <button onClick={() => setShowClearModal(true)} className="p-6 bg-red-50 text-red-500 rounded-[2.5rem] font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-all text-left"><Trash2 size={18}/> Limpiar Historial</button>
                    </div>
                  )}

                  {adminTab === 'activos' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-purple-100 flex flex-col justify-between text-left">
                        <div className="flex justify-between items-start text-left text-left"><TrendingUp size={24}/><span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-left text-left">Ingresos Brutos (Finalizados)</span></div>
                        <p className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mt-8 text-left">${stats.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="lg:col-span-2 bg-gray-50 p-8 rounded-[3rem] border border-gray-100 text-left">
                        <div className="flex items-center gap-2 mb-6 text-left"><BarChart3 size={18} className="text-purple-500 text-left"/><h4 className="font-black text-gray-800 text-lg text-left text-left text-left">Performance por Kit</h4></div>
                        <div className="space-y-4 text-left">
                          {stats.kitStats.map(s => (
                            <div key={s.name} className="space-y-1 text-left text-left text-left">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 text-left"><span>{s.name}</span><span>${s.revenue.toLocaleString()}</span></div>
                              <div className="h-2 bg-white rounded-full overflow-hidden text-left"><div className="h-full bg-purple-500 text-left" style={{ width: `${stats.totalRevenue > 0 ? (s.revenue / stats.totalRevenue) * 100 : 0}%` }}></div></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6 text-left text-left text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2 text-left">
                       <h4 className="font-black text-gray-800 text-xl flex items-center gap-2 text-left text-left">{adminTab === 'activos' ? <ClipboardList size={20} className="text-indigo-500 text-left text-left"/> : <History size={20} className="text-gray-500 text-left text-left"/>}{adminTab === 'activos' ? 'Pedidos por Aprobar/Procesar' : 'Historial Lelune'}</h4>
                       {adminTab === 'historial' && (
                         <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl text-left">
                            <button onClick={() => setHistoryFilter('todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all text-left ${historyFilter === 'todos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>Todos</button>
                            <button onClick={() => setHistoryFilter('listo')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all text-left ${historyFilter === 'listo' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400'}`}>Terminados</button>
                            <button onClick={() => setHistoryFilter('rechazado')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all text-left ${historyFilter === 'rechazado' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400'}`}>Rechazados</button>
                         </div>
                       )}
                    </div>
                    
                    <div className="flex flex-col gap-4 text-left">
                      {filteredOrders.length === 0 ? (<div className="py-20 text-center text-gray-300 font-black uppercase tracking-widest bg-gray-50 rounded-[2rem] border border-dashed flex flex-col items-center gap-4 text-left"><ShoppingBag size={48} className="opacity-20 text-left"/>No se encontraron pedidos</div>) : (
                        filteredOrders.map(o => {
                          const isDeadlineSoon = DELIVERY_DATES.find(d => d.id === o.deliveryDateId)?.isUrgent;
                          return (
                            <div key={o.id} className={`w-full p-6 sm:p-8 rounded-[2rem] border transition-all flex flex-col gap-6 text-left ${o.status === 'listo' ? 'bg-green-50/50 border-green-100' : o.status === 'rechazado' ? 'bg-red-50 opacity-80 border-red-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-left">
                                <div className="space-y-1 text-left">
                                  <div className="flex flex-wrap items-center gap-3 text-left">
                                    <span className="text-[10px] font-black text-gray-300 uppercase text-left">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('es-CL') : 'Reciente'}</span>
                                    {o.status === 'listo' && <span className="bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase text-left">Finalizado</span>}
                                    {o.status === 'aceptado' && <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase text-left">En Proceso</span>}
                                    {o.status === 'rechazado' && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase text-left">Rechazado/Cancelado</span>}
                                    {isDeadlineSoon && o.status === 'pendiente' && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase animate-pulse text-left">Urgente</span>}
                                  </div>
                                  <p className="font-black text-gray-800 text-2xl leading-none text-left text-left">{o.parentName}</p>
                                </div>
                                <div className="text-left lg:text-right text-left"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-left">Total</p><p className="font-black text-purple-600 text-3xl tracking-tighter leading-none mt-1 text-left lg:text-right text-left">${o.total?.toLocaleString()}</p></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-left">
                                <div className="space-y-2 text-left">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left text-left">Información Alumno</p>
                                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-left">
                                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left"><Star size={14} className="text-purple-400 text-left text-left"/> {o.studentName}</span>
                                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left text-left"><Palette size={14} className="text-purple-400 text-left text-left"/> {o.theme}</span>
                                    {o.school && <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left text-left"><School size={14} className="text-purple-400 text-left text-left"/> {o.school}</span>}
                                    {o.grade && <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left text-left"><GraduationCap size={14} className="text-purple-400 text-left text-left"/> {o.grade}</span>}
                                  </div>
                                </div>
                                <div className="space-y-2 text-left">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left text-left text-left text-left">Logística & Pago</p>
                                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-left text-left">
                                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left text-left"><Package size={14} className="text-purple-400 text-left text-left text-left"/> {KITS.find(k => k.id === o.selectedKit)?.name || 'Personalizado'}</span>
                                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left text-left"><MapPin size={14} className="text-purple-400 text-left text-left text-left"/> {o.deliveryType === 'envio' ? o.commune : 'Retiro'}</span>
                                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5 text-left text-left text-left"><CreditCard size={14} className="text-purple-400 text-left text-left text-left text-left"/> {o.paymentMethod === 'mercado_pago' ? 'Mercado Pago' : 'Transferencia'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row gap-3 w-full border-t border-gray-100 pt-6 text-left">
                                <a href={`https://wa.me/56${o.phone}`} target="_blank" className="p-4 bg-green-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] transition-all text-left"><Phone size={14}/> WhatsApp</a>
                                {o.status === 'pendiente' && (<><button onClick={() => updateOrderStatus(o.id, 'aceptado')} className="p-4 bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-[1.02] transition-all text-left text-left"><ThumbsUp size={14}/> Aceptar (Link)</button><button onClick={() => updateOrderStatus(o.id, 'rechazado')} className="p-4 bg-red-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:scale-[1.02] transition-all text-left text-left"><ThumbsDown size={14}/> Rechazar</button></>)}
                                {o.status === 'aceptado' && (<><button onClick={() => updateOrderStatus(o.id, 'listo')} className="p-4 bg-[#8e24aa] text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100 hover:scale-[1.02] transition-all md:flex-1 text-left"><CheckCircle2 size={14}/> Confirmar Pago</button><button onClick={() => updateOrderStatus(o.id, 'rechazado')} className="p-4 bg-red-500 text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:scale-[1.02] transition-all text-left text-left"><ThumbsDown size={14}/> Cancelar Pedido</button></>)}
                                {o.status === 'rechazado' && (<button onClick={() => updateOrderStatus(o.id, 'pendiente')} className="p-4 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all md:flex-1 text-left">Reabrir Solicitud</button>)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear History */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in text-left">
          <div className="bg-white p-8 rounded-[3rem] max-w-sm w-full shadow-2xl text-center space-y-6 text-left text-left">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 text-left"><AlertCircle size={32}/></div>
            <div className="text-left text-left"><h3 className="text-xl font-black text-gray-800 mb-2 text-center text-left">¿Limpiar Historial?</h3><p className="text-sm font-bold text-gray-400 text-center text-left text-left">Esta acción eliminará todos los pedidos finalizados y rechazados permanentemente de la base de datos. Esta acción no se puede deshacer.</p></div>
            <div className="flex gap-3 text-left text-left text-left">
              <button onClick={() => setShowClearModal(false)} className="flex-1 p-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] text-left text-left text-left text-left">Cancelar</button>
              <button onClick={clearHistory} disabled={loading} className="flex-1 p-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-100 text-left text-left text-left text-left text-left">{loading ? 'Borrando...' : 'Sí, Limpiar'}</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e9d5ff; border-radius: 10px; }
        input, select { font-size: 16px !important; }
        .animate-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
