import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { collection, getDocs, getFirestore, limit, query } from 'firebase/firestore'
import brandLogo from './assets/logo.png'
import './index.css'

// --- Types
type Product = {
  id: string
  name: string
  price: number
  oldPrice?: number
  images: string[]
  description: string
  sizes: string[]
  category: string
  stock: number
  brand: string
  code?: string
  tags?: string[]
}

// --- Firebase (Firestore + optional Auth; no Storage)
const firebaseConfig = {
  apiKey: 'AIzaSyAK8rCqRfZwk7nh8I3K2RLljtbtntxqdfM',
  authDomain: 'lux-vetements.firebaseapp.com',
  projectId: 'lux-vetements',
  storageBucket: 'lux-vetements.firebasestorage.app',
  messagingSenderId: '277468166980',
  appId: '1:277468166980:web:187f81a91931374c4ef511',
  measurementId: 'G-NSMWYPM7CS',
}

const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)
void getAuth(firebaseApp)

async function fetchProductsFromFirestore(max = 200): Promise<Product[]> {
  const q = query(collection(db, 'products'), limit(max))
  const snap = await getDocs(q)
  const items: Product[] = []
  snap.forEach((doc) => {
    const data = doc.data() as Omit<Product, 'id'>
    items.push({
      id: doc.id,
      ...data,
      images: Array.isArray((data as any).images) ? (data as any).images : [],
      sizes: Array.isArray((data as any).sizes) ? (data as any).sizes : [],
      brand: (data as any).brand ?? 'Lux Vêtements Homme',
      category: (data as any).category ?? 'new',
      stock: Number((data as any).stock ?? 0),
      price: Number((data as any).price ?? 0),
      oldPrice: (data as any).oldPrice === undefined ? undefined : Number((data as any).oldPrice),
    })
  })
  return items
}

function computeDiscountPercent(oldPrice?: number, price?: number) {
  if (!oldPrice || !price) return 0
  if (oldPrice <= 0 || price >= oldPrice) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

function formatMoneyEUR(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase()
}

function hasTag(product: Product, tag: string) {
  const t = normalizeTag(tag)
  return (product.tags ?? []).some((x) => normalizeTag(x) === t)
}

function filterByCategory(products: Product[], category: string) {
  const c = normalizeTag(category)
  return products.filter((p) => normalizeTag(p.category) === c)
}

function searchProducts(products: Product[], q: string) {
  const queryText = q.trim().toLowerCase()
  if (!queryText) return products
  return products.filter((p) => {
    const hay = `${p.name} ${p.category} ${p.brand} ${(p.tags ?? []).join(' ')}`.toLowerCase()
    return hay.includes(queryText)
  })
}

// --- Seed (demo) products — replace by Firestore documents in production
const c = (path: string) => `https://res.cloudinary.com/demo/image/upload/${path}`

const SEED_PRODUCTS: Product[] = [
  {
    id: 'seed-wool-coat',
    name: 'Manteau laine structuré',
    price: 420,
    oldPrice: 590,
    code: 'LVH-CT-2041',
    images: [c('v1687518808/samples/ecommerce/accessories-bag.jpg'), c('v1687518808/samples/ecommerce/leather-bag-gray.jpg')],
    description:
      'Coupe minimaliste, épaules nettes et tombé premium. Doublure satinée, finitions main. Une pièce signature pour un vestiaire luxe au quotidien.',
    sizes: ['46', '48', '50', '52'],
    category: 'manteaux',
    stock: 4,
    brand: 'Lux Vêtements Homme',
    tags: ['new', 'bestseller'],
  },
  {
    id: 'seed-tailored-blazer',
    name: 'Blazer sur-mesure beige',
    price: 310,
    oldPrice: 390,
    code: 'LVH-BZ-1188',
    images: [c('v1687518808/samples/ecommerce/man-on-stairs.jpg'), c('v1687518808/samples/ecommerce/shoes.png')],
    description:
      'Blazer en laine mélangée, silhouette slim élégante. Idéal en tenue habillée ou déstructurée avec un t-shirt premium.',
    sizes: ['46', '48', '50', '52', '54'],
    category: 'costumes',
    stock: 9,
    brand: 'Lux Vêtements Homme',
    tags: ['bestseller'],
  },
  {
    id: 'seed-cashmere-knit',
    name: 'Pull cachemire col roulé',
    price: 195,
    oldPrice: 245,
    code: 'LVH-KN-3302',
    images: [c('v1687518808/samples/ecommerce/kids-clothing.jpg'), c('v1687518808/samples/ecommerce/analog-classic.jpg')],
    description:
      'Toucher doux, chaleur légère, finitions sobres. Un essentiel hiver au rendu “quiet luxury”.',
    sizes: ['S', 'M', 'L', 'XL'],
    category: 'maille',
    stock: 18,
    brand: 'Lux Vêtements Homme',
    tags: ['new'],
  },
  {
    id: 'seed-tailored-trousers',
    name: 'Pantalon tailleur fuseau',
    price: 165,
    oldPrice: 210,
    code: 'LVH-PT-7710',
    images: [c('v1687518808/samples/ecommerce/leather-bag-gray.jpg'), c('v1687518808/samples/ecommerce/accessories-bag.jpg')],
    description:
      'Ligne épurée, pli net, confort maîtrisé. Associez-le au blazer beige pour un ensemble monochrome premium.',
    sizes: ['38', '40', '42', '44'],
    category: 'pantalons',
    stock: 11,
    brand: 'Lux Vêtements Homme',
    tags: ['bestseller'],
  },
  {
    id: 'seed-leather-sneakers',
    name: 'Sneakers cuir minimal',
    price: 240,
    oldPrice: 320,
    code: 'LVH-SN-9021',
    images: [c('v1687518808/samples/ecommerce/shoes.png'), c('v1687518808/samples/ecommerce/sport-shoes.jpg')],
    description:
      'Cuir pleine fleur, semelle discrète, silhouette épurée. Le détail signature : coutures invisibles et finition satinée.',
    sizes: ['40', '41', '42', '43', '44', '45'],
    category: 'chaussures',
    stock: 6,
    brand: 'Lux Vêtements Homme',
    tags: ['promo', 'bestseller'],
  },
  {
    id: 'seed-silk-shirt',
    name: 'Chemise soie & coton',
    price: 185,
    oldPrice: 230,
    code: 'LVH-SH-4410',
    images: [c('v1687518808/samples/ecommerce/more-fashion.jpg'), c('v1687518808/samples/ecommerce/gem-necklace.jpg')],
    description:
      'Brillance contenue, tombé fluide, boutons nacrés. Parfaite sous un blazer ou portée seule, été comme hiver.',
    sizes: ['S', 'M', 'L', 'XL'],
    category: 'chemises',
    stock: 7,
    brand: 'Lux Vêtements Homme',
    tags: ['new'],
  },
  {
    id: 'seed-merino-polo',
    name: 'Polo mérinos fin',
    price: 125,
    oldPrice: 155,
    code: 'LVH-PL-2209',
    images: [c('v1687518808/samples/ecommerce/cat.jpg'), c('v1687518808/samples/ecommerce/dog.jpg')],
    description:
      'Maille fine respirante, col structuré, silhouette premium casual. Le compromis idéal entre chic et confort.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    category: 'polos',
    stock: 22,
    brand: 'Lux Vêtements Homme',
    tags: ['bestseller'],
  },
  {
    id: 'seed-field-jacket',
    name: 'Veste utilitaire premium',
    price: 275,
    oldPrice: 350,
    code: 'LVH-JK-6612',
    images: [c('v1687518808/samples/ecommerce/car-model-design.jpg'), c('v1687518808/samples/ecommerce/guitar-playing.jpg')],
    description:
      'Coton technique, coupe contemporaine, poches architecturées. Une pièce statement sans excès.',
    sizes: ['S', 'M', 'L', 'XL'],
    category: 'vestes',
    stock: 5,
    brand: 'Lux Vêtements Homme',
    tags: ['promo'],
  },
  {
    id: 'seed-cashmere-scarf',
    name: 'Écharpe cachemire',
    price: 95,
    oldPrice: 120,
    code: 'LVH-AC-1103',
    images: [c('v1687518808/samples/ecommerce/gem-necklace.jpg'), c('v1687518808/samples/ecommerce/more-fashion.jpg')],
    description:
      'Volume luxe, toucher doux, bords roulottés. Un accessoire signature pour compléter une silhouette monochrome.',
    sizes: ['TU'],
    category: 'accessoires',
    stock: 30,
    brand: 'Lux Vêtements Homme',
    tags: ['new'],
  },
  {
    id: 'seed-leather-belt',
    name: 'Ceinture cuir embossé LVH',
    price: 85,
    oldPrice: 110,
    code: 'LVH-BT-7711',
    images: [c('v1687518808/samples/ecommerce/accessories-bag.jpg'), c('v1687518808/samples/ecommerce/leather-bag-gray.jpg')],
    description:
      'Boucle minimaliste, cuir italien, finition mate. Un détail discret qui élève une tenue.',
    sizes: ['90', '95', '100', '105'],
    category: 'accessoires',
    stock: 14,
    brand: 'Lux Vêtements Homme',
    tags: ['promo', 'bestseller'],
  },
  {
    id: 'seed-linen-set',
    name: 'Ensemble lin & soie (édition limitée)',
    price: 360,
    oldPrice: 520,
    code: 'LVH-ST-9901',
    images: [c('v1687518808/samples/ecommerce/leather-bag-gray.jpg'), c('v1687518808/samples/ecommerce/man-on-stairs.jpg')],
    description:
      'Texture légère, reflets naturels, coupe fluide. Pensé pour les soirées d’été et les destinations chaudes.',
    sizes: ['S', 'M', 'L'],
    category: 'ensembles',
    stock: 3,
    brand: 'Lux Vêtements Homme',
    tags: ['new', 'promo', 'bestseller'],
  },
  {
    id: 'seed-overshirt',
    name: 'Surchemise laine légère',
    price: 210,
    oldPrice: 260,
    code: 'LVH-OV-5520',
    images: [c('v1687518808/samples/ecommerce/analog-classic.jpg'), c('v1687518808/samples/ecommerce/kids-clothing.jpg')],
    description:
      'Superposition chic : boutons discrets, poches plaquées, tombé premium. À porter ouverte ou fermée.',
    sizes: ['S', 'M', 'L', 'XL'],
    category: 'chemises',
    stock: 10,
    brand: 'Lux Vêtements Homme',
    tags: ['bestseller'],
  },
]

// --- Products hook
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

function useProducts() {
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remote, setRemote] = useState<Product[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)
    ;(async () => {
      try {
        const items = await fetchProductsFromFirestore()
        if (cancelled) return
        setRemote(items)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setRemote(null)
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Erreur Firestore')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const products = useMemo(() => {
    if (remote && remote.length > 0) return remote
    return SEED_PRODUCTS
  }, [remote])

  const source = remote && remote.length > 0 ? 'firestore' : 'demo'

  return { status, error, products, source }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// --- Cart
type CartItem = { product: Product; qty: number; size?: string }
type CartState = { open: boolean; items: CartItem[] }
type CartAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'ADD'; product: Product; size?: string; qty?: number }
  | { type: 'REMOVE'; id: string; size?: string }
  | { type: 'SET_QTY'; id: string; size?: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; state: CartState }

const CART_KEY = 'lux_cart_v1'

function sameLine(a: CartItem, id: string, size?: string) {
  return a.product.id === id && (a.size ?? '') === (size ?? '')
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    case 'TOGGLE':
      return { ...state, open: !state.open }
    case 'HYDRATE':
      return action.state
    case 'ADD': {
      const qty = Math.max(1, action.qty ?? 1)
      const existing = state.items.find((i) => sameLine(i, action.product.id, action.size))
      if (existing) {
        return {
          ...state,
          open: true,
          items: state.items.map((i) =>
            sameLine(i, action.product.id, action.size) ? { ...i, qty: i.qty + qty } : i,
          ),
        }
      }
      return {
        ...state,
        open: true,
        items: [...state.items, { product: action.product, qty, size: action.size }],
      }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => !sameLine(i, action.id, action.size)) }
    case 'SET_QTY': {
      const qty = Math.max(1, action.qty)
      return {
        ...state,
        items: state.items.map((i) => (sameLine(i, action.id, action.size) ? { ...i, qty } : i)),
      }
    }
    case 'CLEAR':
      return { ...state, items: [] }
    default:
      return state
  }
}

type CartApi = {
  open: boolean
  items: CartItem[]
  count: number
  total: number
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addToCart: (product: Product, opts?: { size?: string; qty?: number }) => void
  removeFromCart: (id: string, opts?: { size?: string }) => void
  setQty: (id: string, qty: number, opts?: { size?: string }) => void
  clear: () => void
}

const CartContext = createContext<CartApi | null>(null)

function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { open: false, items: [] } satisfies CartState)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as CartState
      if (!parsed || !Array.isArray(parsed.items)) return
      dispatch({ type: 'HYDRATE', state: { open: false, items: parsed.items } })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify({ open: false, items: state.items }))
    } catch {
      // ignore
    }
  }, [state.items])

  const api = useMemo<CartApi>(() => {
    const count = state.items.reduce((sum, i) => sum + i.qty, 0)
    const total = state.items.reduce((sum, i) => sum + i.qty * (i.product.price ?? 0), 0)
    return {
      open: state.open,
      items: state.items,
      count,
      total,
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
      toggleCart: () => dispatch({ type: 'TOGGLE' }),
      addToCart: (product, opts) =>
        dispatch({ type: 'ADD', product, size: opts?.size, qty: opts?.qty }),
      removeFromCart: (id, opts) => dispatch({ type: 'REMOVE', id, size: opts?.size }),
      setQty: (id, qty, opts) => dispatch({ type: 'SET_QTY', id, qty, size: opts?.size }),
      clear: () => dispatch({ type: 'CLEAR' }),
    }
  }, [state.items, state.open])

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}

function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

// --- Icon
type IconName =
  | 'search'
  | 'cart'
  | 'profile'
  | 'arrowRight'
  | 'chevronDown'
  | 'close'
  | 'trash'
  | 'plus'
  | 'minus'

function Icon({
  name,
  size = 20,
  className,
  style,
  title,
}: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const
  const stroke = 'currentColor'
  const strokeWidth = 1.7

  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <path d="M10.6 18.2a7.6 7.6 0 1 1 0-15.2 7.6 7.6 0 0 1 0 15.2Z" stroke={stroke} strokeWidth={strokeWidth} />
        <path d="M16.4 16.4 21 21" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      </>
    ),
    cart: (
      <>
        <path
          d="M7.5 7.2h13l-1.2 6.3a3 3 0 0 1-3 2.4H9.2a3 3 0 0 1-3-2.4L5 3.8H2.8"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M9.6 21a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM16.8 21a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </>
    ),
    profile: (
      <>
        <path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke={stroke} strokeWidth={strokeWidth} />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      </>
    ),
    arrowRight: (
      <path
        d="M5 12h12m0 0-5-5m5 5-5 5"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    chevronDown: (
      <path d="M6 9l6 6 6-6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    ),
    close: <path d="M6 6l12 12M18 6 6 18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />,
    trash: (
      <>
        <path
          d="M9 3h6m-8 4h10m-9 0 .7 14a2 2 0 0 0 2 2h3.6a2 2 0 0 0 2-2L18 7"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 11v7M14 11v7" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />,
    minus: <path d="M5 12h14" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />,
  }

  return (
    <svg {...common} className={className} style={style} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  )
}

// --- UI pieces
function ProductCard({ product }: { product: Product }) {
  const imgA = product.images?.[0]
  const imgB = product.images?.[1] ?? product.images?.[0]
  const discount = computeDiscountPercent(product.oldPrice, product.price)

  return (
    <Link className="pCard" to={`/product/${encodeURIComponent(product.id)}`}>
      <div className="pCardMedia">
        {imgA ? (
          <>
            <img className="pImgA" src={imgA} alt="" loading="lazy" decoding="async" />
            {imgB ? <img className="pImgB" src={imgB} alt="" loading="lazy" decoding="async" /> : null}
          </>
        ) : (
          <div className="pPh" />
        )}
        {discount > 0 ? <div className="pDiscount">-{discount}%</div> : null}
      </div>
      <div className="pCardBody">
        <div className="pName">{product.name}</div>
        <div className="pMeta">
          <div className="price">
            {product.oldPrice ? <span className="old">{formatMoneyEUR(product.oldPrice)}</span> : null}
            <span className="new">{formatMoneyEUR(product.price)}</span>
          </div>
          <div className="pCat">{product.category}</div>
        </div>
      </div>
    </Link>
  )
}

function ProductCarousel({
  title,
  subtitle,
  products,
  intervalMs = 5200,
}: {
  title: string
  subtitle?: string
  products: Product[]
  intervalMs?: number
}) {
  const isMobile = useMediaQuery('(max-width: 760px)')
  const items = useMemo(() => products.filter((x) => x.images?.[0]), [products])
  const perView = isMobile ? 1 : 3
  const maxStart = Math.max(0, items.length - perView)
  const pages = useMemo(() => {
    if (items.length === 0) return 1
    return isMobile ? items.length : maxStart + 1
  }, [isMobile, items.length, maxStart])

  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [isMobile, items.length])
  useEffect(() => setPage((p) => Math.min(p, Math.max(0, pages - 1))), [pages])
  useEffect(() => {
    if (pages <= 1) return
    const t = window.setInterval(() => setPage((p) => (p + 1) % pages), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs, pages])

  const start = isMobile ? page : Math.min(page, maxStart)
  const visible = items.slice(start, start + perView)

  return (
    <section className="pCarousel">
      <div className="container pCarouselTop">
        <div>
          <div className="pCarouselTitle">{title}</div>
          {subtitle ? <div className="pCarouselSub">{subtitle}</div> : null}
        </div>
        <div className="pCarouselDots" aria-hidden="true">
          {Array.from({ length: Math.min(10, pages) }).map((_, i) => (
            <span key={i} className={`dot ${i === page ? 'isActive' : ''}`} />
          ))}
        </div>
      </div>
      <div className="container pCarouselStage">
        <div
          className="pCarouselRow"
          key={`${perView}:${start}`}
          style={{ ['--luxCarouselPerView' as keyof CSSProperties]: perView } as CSSProperties}
        >
          {visible.map((p) => (
            <div className="pCarouselCell" key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) => `navLink ${isActive ? 'isActive' : ''}`.trim()

function Navbar() {
  const navigate = useNavigate()
  const cart = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const cartLabel = cart.count <= 0 ? 'Panier' : `Panier — ${cart.count}`

  return (
    <header className="navWrap">
      <div className="container navInner glass">
        <button
          type="button"
          className="iconBtn mobileOnly"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="hamburger" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>

        <NavLink to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <img className="brandLogo" src={brandLogo} alt="" />
          <span className="brandText">
            <span className="brandTitle">Lux Vêtements Homme</span>
            <span className="brandSub">Maison · Paris</span>
          </span>
        </NavLink>

        <nav className="navLinks desktopOnly" aria-label="Navigation principale">
          <NavLink className={navLinkClass} to="/">
            Accueil
          </NavLink>
          <NavLink className={navLinkClass} to="/shop">
            Boutique
          </NavLink>
          <NavLink className={navLinkClass} to="/categories">
            Catégories
          </NavLink>
          <NavLink className={navLinkClass} to="/contact">
            Contact
          </NavLink>
        </nav>

        <form
          className="search desktopOnly"
          onSubmit={(e) => {
            e.preventDefault()
            const queryText = q.trim()
            navigate(queryText ? `/shop?q=${encodeURIComponent(queryText)}` : '/shop')
          }}
        >
          <label className="sr-only" htmlFor="global-search">
            Recherche
          </label>
          <div className="searchField">
            <Icon name="search" size={18} />
            <input
              id="global-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une pièce…"
              autoComplete="off"
            />
          </div>
        </form>

        <div className="navActions">
          <button
            type="button"
            className="iconBtn desktopOnly"
            aria-label="Recherche"
            onClick={() => (document.getElementById('global-search') as HTMLInputElement | null)?.focus()}
          >
            <Icon name="search" />
          </button>

          <button
            type="button"
            className="iconBtn"
            aria-label="Profil"
            onClick={() => alert('Espace client : à connecter avec Firebase Auth (optionnel).')}
          >
            <Icon name="profile" />
          </button>

          <button type="button" className="iconBtn cartBtn" aria-label={cartLabel} onClick={() => cart.toggleCart()}>
            <Icon name="cart" />
            {cart.count > 0 ? <span className="cartBadge">{cart.count}</span> : null}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="mobileMenu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container mobileMenuInner">
            <NavLink className="mobileLink" to="/" onClick={() => setMobileOpen(false)}>
              Accueil
            </NavLink>
            <NavLink className="mobileLink" to="/shop" onClick={() => setMobileOpen(false)}>
              Boutique
            </NavLink>
            <NavLink className="mobileLink" to="/categories" onClick={() => setMobileOpen(false)}>
              Catégories
            </NavLink>
            <NavLink className="mobileLink" to="/contact" onClick={() => setMobileOpen(false)}>
              Contact
            </NavLink>

            <form
              className="mobileSearch"
              onSubmit={(e) => {
                e.preventDefault()
                const queryText = q.trim()
                setMobileOpen(false)
                navigate(queryText ? `/shop?q=${encodeURIComponent(queryText)}` : '/shop')
              }}
            >
              <div className="searchField">
                <Icon name="search" size={18} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" autoComplete="off" />
              </div>
              <button className="btn btn-primary" type="submit">
                Chercher
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footerInner">
        <div className="footerBrand">
          <div className="footerTitle">Lux Vêtements Homme</div>
          <div className="footerSub">
            Mode masculine premium — silhouettes épurées, matières nobles, détails discrets.
          </div>
        </div>

        <div className="footerCols">
          <div className="footerCol">
            <div className="footerColTitle">Boutique</div>
            <NavLink className="footerLink" to="/shop">
              Toutes les pièces
            </NavLink>
            <NavLink className="footerLink" to="/categories">
              Catégories
            </NavLink>
            <NavLink className="footerLink" to="/contact">
              Contact
            </NavLink>
          </div>

          <div className="footerCol">
            <div className="footerColTitle">Service</div>
            <div className="footerMuted">Livraison soignée</div>
            <div className="footerMuted">Retours sous 14 jours</div>
            <div className="footerMuted">Conseil taille (bientôt)</div>
          </div>

          <div className="footerCol">
            <div className="footerColTitle">Newsletter</div>
            <div className="footerMuted">Recevez les nouveautés et ventes privées.</div>
            <form
              className="newsletter"
              onSubmit={(e) => {
                e.preventDefault()
                alert('Merci — intégration newsletter à connecter (Mailchimp / Resend / etc.).')
              }}
            >
              <label className="sr-only" htmlFor="newsletter-email">
                Email
              </label>
              <input id="newsletter-email" type="email" placeholder="Votre email" required />
              <button className="btn btn-primary" type="submit">
                S’inscrire
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="footerBottom">
        <div className="container footerBottomInner">
          <div className="footerTiny">© {new Date().getFullYear()} Lux Vêtements Homme</div>
          <div className="footerTiny muted">Paris — Crafted for modern tailoring</div>
        </div>
      </div>
    </footer>
  )
}

function CartDrawer() {
  const cart = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cart.closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cart])

  return (
    <div className={`cartDrawerRoot ${cart.open ? 'isOpen' : ''}`} aria-hidden={!cart.open}>
      <button type="button" className="cartScrim" aria-label="Fermer le panier" onClick={() => cart.closeCart()} />

      <aside className="cartPanel glass" role="dialog" aria-modal="true" aria-label="Panier">
        <div className="cartHeader">
          <div>
            <div className="cartTitle">Panier</div>
            <div className="cartSubtitle">{cart.count} article(s)</div>
          </div>
          <button type="button" className="iconBtn" aria-label="Fermer" onClick={() => cart.closeCart()}>
            <Icon name="close" />
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="cartEmpty">
            <div className="cartEmptyTitle">Votre sélection est vide</div>
            <div className="cartEmptySub">Découvrez la nouvelle collection en boutique.</div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                cart.closeCart()
                navigate('/shop')
              }}
            >
              Explorer la boutique
            </button>
          </div>
        ) : (
          <div className="cartBody">
            <div className="cartItems">
              {cart.items.map((line) => {
                const img = line.product.images?.[0]
                return (
                  <div className="cartLine" key={`${line.product.id}:${line.size ?? ''}`}>
                    <div className="cartLineMedia">
                      {img ? <img src={img} alt="" loading="lazy" /> : <div className="cartLinePh" />}
                    </div>
                    <div className="cartLineInfo">
                      <div className="cartLineName">{line.product.name}</div>
                      <div className="cartLineMeta">
                        {line.size ? <span>Taille {line.size}</span> : null}
                        <span>{formatMoneyEUR(line.product.price)}</span>
                      </div>

                      <div className="cartLineControls">
                        <div className="qty">
                          <button
                            type="button"
                            className="qtyBtn"
                            aria-label="Diminuer"
                            onClick={() => {
                              if (line.qty <= 1) {
                                cart.removeFromCart(line.product.id, { size: line.size })
                                return
                              }
                              cart.setQty(line.product.id, line.qty - 1, { size: line.size })
                            }}
                          >
                            <Icon name="minus" size={18} />
                          </button>
                          <div className="qtyVal">{line.qty}</div>
                          <button
                            type="button"
                            className="qtyBtn"
                            aria-label="Augmenter"
                            onClick={() => cart.setQty(line.product.id, line.qty + 1, { size: line.size })}
                          >
                            <Icon name="plus" size={18} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="ghostBtn"
                          onClick={() => cart.removeFromCart(line.product.id, { size: line.size })}
                        >
                          <Icon name="trash" size={18} />
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="cartFooter">
              <div className="cartTotalRow">
                <div>Total</div>
                <div className="cartTotal">{formatMoneyEUR(cart.total)}</div>
              </div>
              <button
                type="button"
                className="btn btn-primary cartCheckout"
                onClick={() => {
                  cart.closeCart()
                  navigate('/checkout')
                }}
              >
                Passer commande
              </button>
              <button type="button" className="btn" onClick={() => cart.clear()}>
                Vider le panier
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function Layout() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <div className="appShell">
      <Navbar />
      <CartDrawer />
      <main className="appMain">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function HomePage() {
  const { products, source, status, error } = useProducts()
  const newIn = useMemo(() => products.filter((p) => hasTag(p, 'new')), [products])
  const best = useMemo(() => products.filter((p) => hasTag(p, 'bestseller')), [products])
  const promos = useMemo(
    () => products.filter((p) => p.oldPrice && computeDiscountPercent(p.oldPrice, p.price) > 0),
    [products],
  )
  const ig = useMemo(() => products.slice(0, 12), [products])

  return (
    <div>
      <section className="hero">
        <div className="container heroInner">
          <div className="heroCopy">
            <div className="heroKicker">
              Nouvelle saison
              {source === 'firestore' ? <span className="heroPill">Live Firestore</span> : null}
            </div>
            <h1 className="heroTitle">Silhouettes nettes. Matières nobles. Luxe silencieux.</h1>
            <p className="heroSub">
              Une garde-robe masculine pensée comme une collection : essentiels impeccables, coupes contemporaines,
              finitions discrètement remarquables.
            </p>

            <div className="heroCtas">
              <Link className="btn btn-primary heroCta" to="/shop">
                Shop Now
              </Link>
              <Link className="btn heroCta2" to="/categories">
                Explorer les catégories
              </Link>
            </div>

            {status === 'error' ? (
              <div className="heroWarn">Firestore indisponible pour le moment ({error}). Affichage démo activé.</div>
            ) : null}
          </div>

          <div className="heroArt" aria-hidden="true">
            <div className="heroOrb" />
            <img className="heroLogo" src={brandLogo} alt="" />
            <div className="heroFrame">
              <div className="heroFrameTitle">Édition Maison</div>
              <div className="heroFrameSub">Limited drops · Tailoring moderne</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container sectionHead">
          <h2 className="sectionTitle">New Collection</h2>
          <p className="sectionSub">Les pièces signature — sobres, précises, profondément premium.</p>
        </div>
        <div className="container grid3">
          {(newIn.length ? newIn : products).slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="section soft">
        <ProductCarousel
          title="Best Sellers"
          subtitle="Les favoris de la semaine — rotation automatique, comme un window display."
          products={best.length ? best : products}
        />
      </section>

      <section className="section">
        <div className="container sectionHead">
          <h2 className="sectionTitle">Promotions</h2>
          <p className="sectionSub">Sélection pointue — quantités limitées.</p>
        </div>
        <div className="container grid3">
          {(promos.length ? promos : products).slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="section soft">
        <div className="container sectionHead">
          <h2 className="sectionTitle">Le journal (style Instagram)</h2>
          <p className="sectionSub">Une grille immersive — survolez pour voir la seconde vue.</p>
        </div>
        <div className="container igGrid">
          {ig.map((p) => {
            const a = p.images?.[0]
            const b = p.images?.[1] ?? p.images?.[0]
            return (
              <Link key={p.id} className="igCell" to={`/product/${encodeURIComponent(p.id)}`}>
                <div className="igMedia">
                  {a ? (
                    <>
                      <img className="igA" src={a} alt="" loading="lazy" decoding="async" />
                      {b ? <img className="igB" src={b} alt="" loading="lazy" decoding="async" /> : null}
                    </>
                  ) : (
                    <div className="igPh" />
                  )}
                </div>
                <div className="igCap">
                  <div className="igName">{p.name}</div>
                  <div className="igHint">Voir le produit</div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ShopPage() {
  const { products } = useProducts()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''

  const filtered = useMemo(() => {
    let list = products
    if (category) list = filterByCategory(list, category)
    list = searchProducts(list, q)
    return list
  }, [products, category, q])

  return (
    <div className="pagePad">
      <div className="container">
        <div className="pageHead">
          <h1 className="pageTitle">Boutique</h1>
          <p className="pageSub">
            {category ? (
              <>
                Catégorie : <span className="hl">{category}</span>
              </>
            ) : null}
            {q ? (
              <>
                {category ? ' · ' : null}
                Recherche : <span className="hl">{q}</span>
              </>
            ) : null}
            {!category && !q ? 'Toutes les pièces — sélection premium.' : null}
          </p>
        </div>

        <div className="grid3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductPage() {
  const { id } = useParams()
  const cart = useCart()
  const { products } = useProducts()
  const product = useMemo(() => products.find((p) => p.id === decodeURIComponent(id ?? '')), [products, id])

  const [idx, setIdx] = useState(0)
  const [size, setSize] = useState<string | undefined>(undefined)
  const zoomRef = useRef<HTMLDivElement | null>(null)
  const [zoomOn, setZoomOn] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    setIdx(0)
    setSize(undefined)
  }, [id])

  if (!product) {
    return (
      <div className="pagePad">
        <div className="container">
          <p>Produit introuvable.</p>
          <Link className="btn btn-primary" to="/shop">
            Retour boutique
          </Link>
        </div>
      </div>
    )
  }

  const images = product.images?.length ? product.images : []
  const main = images[idx] ?? ''
  const discount = computeDiscountPercent(product.oldPrice, product.price)
  const needsSize = product.sizes.length > 0
  const canAdd = !needsSize || Boolean(size)

  const stockHint =
    product.stock <= 0
      ? 'Rupture de stock'
      : product.stock <= 3
        ? 'Dernières unités — stock très limité'
        : product.stock <= 8
          ? 'Plus que quelques pièces en stock'
          : 'En stock'

  const onZoomMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = zoomRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    setZoomPos({ x, y })
  }

  return (
    <div className="pagePad productPage">
      <div className="container productGrid">
        <div className="productGallery">
          <div
            ref={zoomRef}
            className={`zoomWrap ${zoomOn ? 'isZooming' : ''}`}
            onMouseEnter={() => setZoomOn(true)}
            onMouseLeave={() => setZoomOn(false)}
            onMouseMove={onZoomMove}
          >
            {main ? (
              <img
                className="zoomImg"
                src={main}
                alt=""
                loading="lazy"
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: zoomOn ? 'scale(1.22)' : 'scale(1)',
                }}
              />
            ) : (
              <div className="zoomPh" />
            )}
          </div>

          <div className="thumbs">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                className={`thumb ${i === idx ? 'isActive' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`Image ${i + 1}`}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="productInfo">
          <div className="productBrand">{product.brand}</div>
          <h1 className="productTitle">{product.name}</h1>

          <div className="productPriceRow">
            <div className="price">
              {product.oldPrice ? <span className="old">{formatMoneyEUR(product.oldPrice)}</span> : null}
              <span className="new">{formatMoneyEUR(product.price)}</span>
            </div>
            {discount > 0 ? <span className="badge-danger">-{discount}%</span> : null}
          </div>

          <div className="metaGrid">
            <div className="metaItem">
              <div className="metaLabel">Référence</div>
              <div className="metaValue">{product.code ?? product.id}</div>
            </div>
            <div className="metaItem">
              <div className="metaLabel">Catégorie</div>
              <div className="metaValue">{product.category}</div>
            </div>
            <div className="metaItem">
              <div className="metaLabel">Stock</div>
              <div className={`metaValue ${product.stock <= 8 ? 'isUrgent' : ''}`}>{stockHint}</div>
            </div>
          </div>

          <div className="productDesc">{product.description}</div>

          {needsSize ? (
            <div className="sizes">
              <div className="sizesLabel">Taille</div>
              <div className="sizeRow">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`sizeBtn ${size === s ? 'isActive' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="productDesktopCta">
            <button
              type="button"
              className="btn btn-primary productAdd"
              disabled={!canAdd || product.stock <= 0}
              onClick={() => cart.addToCart(product, { size })}
            >
              Ajouter au panier
            </button>
            {!canAdd ? <div className="hint">Sélectionnez une taille.</div> : null}
          </div>
        </div>
      </div>

      <div className="productSticky">
        <div className="container stickyInner">
          <div className="stickyLeft">
            <div className="stickyName">{product.name}</div>
            <div className="price">
              {product.oldPrice ? <span className="old">{formatMoneyEUR(product.oldPrice)}</span> : null}
              <span className="new">{formatMoneyEUR(product.price)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary stickyAdd"
            disabled={!canAdd || product.stock <= 0}
            onClick={() => cart.addToCart(product, { size })}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoriesPage() {
  const { products } = useProducts()
  const cats = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) {
      const k = normalizeTag(p.category)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [products])

  return (
    <div className="pagePad">
      <div className="container">
        <div className="pageHead">
          <h1 className="pageTitle">Catégories</h1>
          <p className="pageSub">Navigation rapide vers les univers de la collection.</p>
        </div>

        <div className="catGrid">
          {cats.map(([cat, count]) => (
            <Link key={cat} className="catCard" to={`/shop?category=${encodeURIComponent(cat)}`}>
              <div className="catName">{cat}</div>
              <div className="catCount">{count} pièce(s)</div>
              <div className="catGo">
                Voir <Icon name="arrowRight" size={18} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContactPage() {
  return (
    <div className="pagePad">
      <div className="container narrow">
        <div className="pageHead">
          <h1 className="pageTitle">Contact</h1>
          <p className="pageSub">Showroom sur rendez-vous — réponse sous 24h.</p>
        </div>

        <form
          className="formCard"
          onSubmit={(e) => {
            e.preventDefault()
            alert('Message envoyé (démo). Branchez un backend / Email / CRM pour la production.')
          }}
        >
          <label className="field">
            <span>Nom</span>
            <input required placeholder="Votre nom" />
          </label>
          <label className="field">
            <span>Email</span>
            <input required type="email" placeholder="vous@exemple.com" />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea required rows={6} placeholder="Comment pouvons-nous vous aider ?" />
          </label>
          <button className="btn btn-primary" type="submit">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  )
}

function CheckoutPage() {
  const cart = useCart()
  const navigate = useNavigate()

  return (
    <div className="pagePad">
      <div className="container checkoutGrid">
        <div>
          <div className="pageHead">
            <h1 className="pageTitle">Checkout</h1>
            <p className="pageSub">Commande simple — paiement à intégrer (Stripe, etc.).</p>
          </div>

          <form
            className="formCard"
            onSubmit={(e) => {
              e.preventDefault()
              alert('Merci ! Commande enregistrée (démo).')
              cart.clear()
              navigate('/')
            }}
          >
            <label className="field">
              <span>Nom complet</span>
              <input required placeholder="Prénom Nom" />
            </label>
            <label className="field">
              <span>Téléphone</span>
              <input required placeholder="+33 …" />
            </label>
            <label className="field">
              <span>Adresse</span>
              <textarea required rows={5} placeholder="Adresse, ville, code postal" />
            </label>
            <button className="btn btn-primary" type="submit" disabled={cart.items.length === 0}>
              Confirmer la commande
            </button>
          </form>
        </div>

        <aside className="summaryCard">
          <div className="summaryTitle">Récapitulatif</div>
          {cart.items.length === 0 ? (
            <p className="muted">Votre panier est vide.</p>
          ) : (
            <div className="summaryLines">
              {cart.items.map((line) => (
                <div className="summaryLine" key={`${line.product.id}:${line.size ?? ''}`}>
                  <div>
                    <div className="sName">{line.product.name}</div>
                    <div className="sMeta">
                      x{line.qty}
                      {line.size ? ` · Taille ${line.size}` : ''}
                    </div>
                  </div>
                  <div className="sPrice">{formatMoneyEUR(line.product.price * line.qty)}</div>
                </div>
              ))}
              <div className="summaryTotal">
                <div>Total</div>
                <div>{formatMoneyEUR(cart.total)}</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
