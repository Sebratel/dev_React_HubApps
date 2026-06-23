# Login Screen — Technical Specification
**Sebratel Hub · Design System GER**
> This document is the authoritative reference for replicating the Sebratel Hub login screen in any new application. Follow every token, shadow value, and layout rule exactly. Deviations break brand consistency.

---

## 1. Design Tokens

### 1.1 Color Palette

| Role | Hex | Usage |
|---|---|---|
| `primary` | `#FFB000` | CTA buttons, highlights, amber accent |
| `primary-dark` | `#2d1800` | Text on amber backgrounds |
| `body-dark` | `#1a0f00` | Main headings on light panels |
| `muted-text` | `#7a6a55` | Subtitles, secondary text |
| `footer-text` | `#a0917d` | Footer, captions |
| `divider` | `#d8cfc0` | HR lines |
| `right-bg` | `#efefed` | Entire right panel background |
| `left-bg` | `#0d0a06` | Left panel base (behind image) |
| `destructive` | `#DC2626` | Error states |
| `success` | `#16A34A` | Success states |

> **Absolute rule:** No blue tones. No dark mode. No gradients on interactive elements. No purple.

### 1.2 Typography

- **Font family:** `DM Sans` (Google Fonts) — applied globally via `font-family: 'DM Sans', sans-serif`
- **Font smoothing:** `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale`

| Element | Size | Weight | Color |
|---|---|---|---|
| Main heading (left) | `2.4rem` | `900` (black) | `#ffffff` |
| Amber word (left heading) | `2.4rem` | `900` | `#FFB000` |
| Sub-paragraph (left) | `0.875rem` | `500` | `rgba(255,255,255,0.50)` |
| Badge label | `11px` | `700` | `primary` |
| Right heading | `1.75rem` | `900` | `#1a0f00` |
| Right subtitle | `0.875rem` | `400` | `#7a6a55` |
| Domain label | `10px` | `700` | `primary` uppercase, tracking `0.14em` |
| Domain value | `0.875rem` | `700` | `#1a0f00` |
| Google button | `0.875rem` | `700` | `#1a0f00` |
| Footer | `10px` | `400` | `#a0917d` uppercase, tracking `widest` |

---

## 2. Layout Structure

```
┌──────────────────────────────────────────┬─┬──────────────┐
│                                          │ │              │
│          LEFT PANEL (flex-1)             │▓│  RIGHT PANEL │
│          hidden on < lg                  │ │  w-full      │
│                                          │ │  lg:w-[35%]  │
└──────────────────────────────────────────┴─┴──────────────┘
                                           ↑
                              Amber divider w-1.5 bg-[#FFB000]
```

**Root container:**
```css
height: 100vh;
width: 100vw;
display: flex;
overflow: hidden;
```

---

## 3. Left Panel

**Visible only on `lg` and above (`hidden lg:flex`).**

### 3.1 Base

```css
position: relative;
display: flex;
flex-direction: column;
justify-content: flex-end;
flex: 1;
overflow: hidden;
background: #0d0a06;
```

### 3.2 Background Image

```tsx
<img
  src="/login-cover.png"
  alt=""
  aria-hidden
  draggable={false}
  className="absolute inset-0 w-full h-full object-cover object-center opacity-95 animate-ken-burns"
/>
```

- `object-fit: cover`, `object-position: center`
- `opacity: 0.95` (95% — intentional, not 100%)
- Animation: `animate-ken-burns` — slow parallax zoom (see §3.3)

### 3.3 Ken Burns Animation

Defined in `src/styles/globals.css`:

```css
@keyframes ken-burns {
  0%   { transform: scale(1)    translate(0, 0); }
  50%  { transform: scale(1.03) translate(-0.5%, 0.5%); }
  100% { transform: scale(1)    translate(0, 0); }
}
.animate-ken-burns {
  animation: ken-burns 24s ease-in-out infinite;
  transform-origin: center center;
}
```

### 3.4 Overlays (stacked in order)

**Overlay 1 — Amber tint:**
```css
position: absolute;
inset: 0;
background: linear-gradient(
  to bottom right,
  rgba(45, 24, 0, 0.60),
  transparent,
  rgba(13, 10, 6, 0.40)
);
```

**Overlay 2 — Bottom legibility fade:**
```css
position: absolute;
bottom: 0; left: 0; right: 0;
height: 13rem; /* h-52 */
background: linear-gradient(
  to top,
  rgba(0, 0, 0, 0.70),
  rgba(0, 0, 0, 0.30),
  transparent
);
```

### 3.5 Bottom Content Area

```css
position: relative;
z-index: 10;
padding: 2.5rem 3rem; /* py-10 px-12 */
display: flex;
align-items: flex-end;
justify-content: space-between;
gap: 1.5rem;
```

#### 3.5.1 Text Block (left side)

**Brand badge:**
```tsx
<div className="flex items-center gap-2 mb-5">
  <img src="/logo-circular-sebratel.png" alt="Sebratel" className="w-10 h-10 opacity-90" />
  <span className="text-xs font-bold tracking-[0.18em] text-white/70 uppercase">
    Sebratel Hub
  </span>
</div>
```

**Main heading:**
```tsx
<h1 className="text-[2.4rem] font-black text-white leading-[1.15] tracking-tight">
  A conexão que<br />
  move{' '}
  <span className="text-[#FFB000]">o que importa.</span>
</h1>
```

**Subtitle:**
```tsx
<p className="mt-3 text-sm text-white/50 font-medium leading-relaxed max-w-sm">
  Tecnologia e pessoas conectadas para levar o melhor todos os dias.
</p>
```

#### 3.5.2 Hex Icon Grid (right side)

A 2×3 grid of hexagonal icons positioned at the bottom-right of the left panel.

**Grid container:**
```css
flex-shrink: 0;
display: flex;
flex-direction: column;
gap: 0.375rem; /* gap-1.5 */
padding-bottom: 0.25rem; /* pb-1 */
```

**Row:**
```css
display: flex;
gap: 0.375rem; /* gap-1.5 */
```

**HexIcon component:**
```tsx
function HexIcon({ children, style }) {
  return (
    <div
      className="relative pointer-events-none select-none"
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,176,0,0.35))' }}
      aria-hidden
    >
      <svg width="64" height="72" viewBox="0 0 64 72">
        <polygon
          points="32,2 62,18 62,54 32,70 2,54 2,18"
          fill="rgba(255,176,0,0.10)"
          stroke="rgba(255,176,0,0.80)"
          strokeWidth="1.8"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[#FFB000]">
        {children}
      </div>
    </div>
  )
}
```

**HexIcon rules:**
- SVG hexagon: flat-top orientation, `64×72` viewport
- Fill: `rgba(255, 176, 0, 0.10)` — nearly transparent amber
- Stroke: `rgba(255, 176, 0, 0.80)` — semi-opaque amber
- Stroke width: `1.8px`
- Drop shadow filter: `drop-shadow(0 0 8px rgba(255,176,0,0.35))`
- Icon color inside: `#FFB000` (amber)
- Icon size: `20×20`
- Icons are **fill-based SVGs** (not stroke-based)

**Icon set (row 1 → row 2):**

```tsx
// Row 1
const IconBolt = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IconCloud = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
)
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
)

// Row 2
const IconBattery = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 11v2h-1V7a2 2 0 0 0-2-2H1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h19a2 2 0 0 0 2-2v-4h1zm-3 7H1V7h19v11z" />
  </svg>
)
const IconWifi = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
  </svg>
)
const IconBarChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
)
```

**Grid layout:**
```tsx
<div className="shrink-0 flex flex-col gap-1.5 pb-1">
  <div className="flex gap-1.5">
    <HexIcon><IconBolt /></HexIcon>
    <HexIcon><IconCloud /></HexIcon>
    <HexIcon><IconUsers /></HexIcon>
  </div>
  <div className="flex gap-1.5">
    <HexIcon><IconBattery /></HexIcon>
    <HexIcon><IconWifi /></HexIcon>
    <HexIcon><IconBarChart /></HexIcon>
  </div>
</div>
```

---

## 4. Amber Divider Bar

```tsx
<div className="hidden lg:block w-1.5 shrink-0 bg-[#FFB000] z-10" aria-hidden />
```

- `width: 6px` (`w-1.5`)
- `background: #FFB000`
- `z-index: 10` (sits above both panels)
- Hidden on mobile — only visible on `lg` and above

---

## 5. Right Panel

### 5.1 Shell

```css
/* Mobile: full width. lg+: 35% of viewport */
width: 100%;
lg:width: 35%;
flex-shrink: 0;
display: flex;
flex-direction: column;
background: #efefed;
overflow-y: auto;
```

**Inner centering wrapper:**
```css
flex: 1;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 3rem 2rem; /* py-12 px-8 */
```

**Content column:**
```css
width: 100%;
max-width: 320px;
display: flex;
flex-direction: column;
align-items: center;
gap: 1.5rem; /* gap-6 */
```

---

### 5.2 Top Badge — Neumorphic Pill

```tsx
<span
  className="inline-flex items-center rounded-full px-5 py-1.5 text-[11px] font-bold tracking-[0.18em] text-primary uppercase"
  style={{
    background: '#efefed',
    boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.12), inset -2px -2px 6px rgba(255,255,255,0.85)',
  }}
>
  Sebratel Hub
</span>
```

**Neumorphic rule — inset (pressed/sunken):**
- Dark shadow: `inset 3px 3px 7px rgba(0,0,0,0.12)` — top-left, creates depth illusion
- Light shadow: `inset -2px -2px 6px rgba(255,255,255,0.85)` — bottom-right highlight
- Background **must match** the parent background exactly (`#efefed`)

---

### 5.3 Heading Block

```tsx
<div className="text-center">
  <h2 className="text-[1.75rem] font-black text-[#1a0f00] tracking-tight leading-tight">
    Acessar plataforma
  </h2>
  <p className="mt-2 text-sm text-[#7a6a55] leading-snug">
    Acesso com conta Google para controle de<br />permissões por módulo.
  </p>
</div>
```

---

### 5.4 Domain Card — Neumorphic Elevated

```tsx
<div
  className="w-full flex items-center gap-4 rounded-2xl bg-[#efefed] px-5 py-4"
  style={{
    boxShadow: '6px 6px 14px rgba(0,0,0,0.11), -4px -4px 10px rgba(255,255,255,0.9)',
  }}
>
  {/* Lock icon box — inset neumorphic */}
  <div
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
    style={{
      background: '#efefed',
      boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.82)',
    }}
  >
    <Lock className="h-5 w-5 text-primary" />
  </div>

  {/* Text */}
  <div>
    <p className="text-[10px] font-bold tracking-[0.14em] text-primary uppercase">
      Domínio liberado:
    </p>
    <p className="text-sm font-bold text-[#1a0f00]">@sebratel.com.br</p>
  </div>
</div>
```

**Neumorphic rule — outer (elevated/raised):**
- Dark shadow: `6px 6px 14px rgba(0,0,0,0.11)` — bottom-right, simulates light from top-left
- Light shadow: `-4px -4px 10px rgba(255,255,255,0.9)` — top-left highlight
- Background **must match** parent (`#efefed`)

**Icon box is inset (countersunk):** contrast with the outer-shadow card creates visual hierarchy — card floats, icon box is pressed in.

---

### 5.5 Primary CTA — Google Sign-In Button

```tsx
<button
  onClick={handleGoogleSignIn}
  disabled={isLoading}
  className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-primary text-[#1a0f00] font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-60"
  style={{
    boxShadow: '0 4px 18px rgba(255,176,0,0.45), 0 1px 4px rgba(0,0,0,0.12)',
  }}
>
  {GOOGLE_SVG}
  Entrar com Google
</button>
```

**Key properties:**
- `height: 56px` (`h-14`)
- `border-radius: 1rem` (`rounded-2xl`)
- `background: #FFB000` (primary)
- Box shadow: amber glow `0 4px 18px rgba(255,176,0,0.45)` + subtle drop `0 1px 4px rgba(0,0,0,0.12)`
- Press animation: `active:scale-[0.98]`
- Disabled: `opacity-60`, no cursor change

**Google SVG icon** (inline, do not use an external library):
```tsx
const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)
```

---

### 5.6 Divider

```tsx
<div className="flex items-center gap-3 w-full">
  <div className="flex-1 h-px bg-[#d8cfc0]" />
  <span className="text-[11px] font-semibold text-[#a0917d] tracking-widest">ou</span>
  <div className="flex-1 h-px bg-[#d8cfc0]" />
</div>
```

---

### 5.7 Secondary Access — Expandable Email Form

A collapsible section triggered by a toggle button. Hidden by default.

**Toggle button:**
```tsx
<button
  type="button"
  onClick={() => setShowEmail((v) => !v)}
  className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
>
  {showEmail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
  Problemas para acessar?
</button>
```

**Email form (conditional render, animated):**
```tsx
{showEmail && (
  <form
    onSubmit={handleEmailSignIn}
    className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
  >
    <Input
      type="email"
      placeholder="E-mail corporativo"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
      autoComplete="email"
      disabled={isLoading}
      className="h-11 bg-white border-[#d8cfc0] focus:border-primary"
    />
    <Input
      type="password"
      placeholder="Senha"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
      autoComplete="current-password"
      disabled={isLoading}
      className="h-11 bg-white border-[#d8cfc0] focus:border-primary"
    />
    <button
      type="button"
      onClick={handlePasswordReset}
      disabled={resetState !== 'idle' || isLoading}
      className="self-end text-[12px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
    >
      {resetState === 'sending' ? 'Enviando...'
        : resetState === 'sent' ? 'E-mail enviado ✓'
        : 'Esqueci minha senha'}
    </button>
    <Button type="submit" className="h-11 font-bold" disabled={isLoading || !email || !password}>
      {isLoading ? 'Entrando...' : 'Entrar'}
    </Button>
    {resetState === 'sent' && (
      <p className="text-xs text-center text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        Se este e-mail estiver cadastrado, você receberá as instruções.
      </p>
    )}
    {resetError && (
      <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
        {resetError}
      </p>
    )}
  </form>
)}
```

---

### 5.8 Error Display

Shown when auth fails (both Google and email flows):

```tsx
{displayError && (
  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    <p className="text-xs text-destructive">{displayError}</p>
  </div>
)}
```

---

### 5.9 Footer

```tsx
<p className="text-[10px] text-[#a0917d] text-center pb-5 select-none tracking-widest uppercase">
  © {new Date().getFullYear()} Sebratel · Uso interno
</p>
```

Positioned at the bottom of the right panel (outside the flex-center wrapper), uses `pb-5` for breathing room.

---

## 6. Neumorphic Design Rules

This screen uses the **neumorphic** (soft UI) pattern throughout the right panel. The background is always `#efefed`. All neumorphic elements must use the **same hex** as their direct parent background.

### Outer shadow (elevated/raised element):
```css
box-shadow:
  6px 6px 14px rgba(0, 0, 0, 0.11),
  -4px -4px 10px rgba(255, 255, 255, 0.90);
```
Used for: domain card, any raised card

### Inset shadow (pressed/sunken element):
```css
/* Badge variant */
box-shadow:
  inset 3px 3px 7px rgba(0, 0, 0, 0.12),
  inset -2px -2px 6px rgba(255, 255, 255, 0.85);

/* Icon box variant */
box-shadow:
  inset 2px 2px 5px rgba(0, 0, 0, 0.12),
  inset -2px -2px 5px rgba(255, 255, 255, 0.82);
```
Used for: badge pill, icon container inside domain card

### CTA button shadow (glow, not neumorphic):
```css
box-shadow:
  0 4px 18px rgba(255, 176, 0, 0.45),
  0 1px 4px rgba(0, 0, 0, 0.12);
```
Amber glow below the button — not a neumorphic element.

---

## 7. Responsive Behavior

| Breakpoint | Left Panel | Divider | Right Panel |
|---|---|---|---|
| `< lg` (< 1024px) | **Hidden** | **Hidden** | Full width (`w-full`) |
| `≥ lg` (≥ 1024px) | Visible (`flex-1`) | Visible | Fixed `w-[35%]` |

On mobile, only the right panel (form) is shown. The left panel and amber divider are completely hidden via `hidden lg:flex` / `hidden lg:block`.

---

## 8. State Machine

```
idle
 └─ user clicks "Entrar com Google" → isLoading = true
     ├─ success → navigate to redirect target
     └─ failure → setError(message) → display error banner

 └─ user clicks "Problemas para acessar?" → showEmail = true
     └─ form visible
         ├─ submit → isLoading = true
         │    ├─ success → navigate
         │    └─ failure → setError(message)
         └─ "Esqueci minha senha" clicked
              ├─ email empty → setResetError('Preencha o e-mail')
              ├─ sending → resetState = 'sending'
              ├─ success → resetState = 'sent'
              └─ failure → resetState = 'idle', setResetError(message)
```

---

## 9. Auth Service Interface

The login page calls these three functions from `@/services/auth.service`:

```ts
// Google OAuth popup flow
signInWithGoogle(): Promise<{ success: boolean; error?: string }>

// Email + password
signInWithEmailAndPassword(email: string, password: string): Promise<{ success: boolean; error?: string }>

// Firebase password reset email
sendPasswordResetEmail(email: string): Promise<void>
```

Navigation after login uses `react-router-dom`'s `useNavigate`. The redirect target is read from `location.state.from.pathname` (protected route guard sets this before redirecting to login).

---

## 10. Assets Required

| File | Purpose |
|---|---|
| `/login-cover.png` | Left panel full-bleed background image |
| `/logo-circular-sebratel.png` | Sebratel circular logo — shown in left panel badge |

Both are served from the `/public` directory (Vite static assets).

---

## 11. CSS Animations Required

The following custom animations must be declared in the global stylesheet (`globals.css`):

```css
/* Ken Burns — slow zoom/pan on background image */
@keyframes ken-burns {
  0%   { transform: scale(1)    translate(0, 0); }
  50%  { transform: scale(1.03) translate(-0.5%, 0.5%); }
  100% { transform: scale(1)    translate(0, 0); }
}
.animate-ken-burns {
  animation: ken-burns 24s ease-in-out infinite;
  transform-origin: center center;
}
```

Tailwind `animate-in`, `fade-in`, `slide-in-from-top-2` are from the `tailwindcss-animate` plugin (used for the email form reveal).

---

## 12. Dependencies

| Package | Role |
|---|---|
| `react-router-dom` | Navigation, redirect after login |
| `lucide-react` | `Lock`, `AlertCircle`, `ChevronDown`, `ChevronUp` icons |
| `tailwindcss` | Utility classes |
| `tailwindcss-animate` | `animate-in`, `fade-in`, slide animations |

Auth store: `useAuthStore` from `@/stores/auth.store` — provides `error` and `setError`. Uses **no `persist` middleware**. Auth state (user, permissions, isAdmin) is **never written to localStorage**.

---

## 13. What NOT to Do

- **No dark mode.** The right panel is always `#efefed`. Do not use CSS variables that swap on `prefers-color-scheme`.
- **No blue tones.** The only accent color is amber (`#FFB000`). Do not use Tailwind's default blue for buttons, links, or focus rings.
- **No gradients on buttons.** The Google button is flat `bg-primary` with an amber glow shadow.
- **No border on neumorphic elements.** Depth is created by shadow only — no `border` property.
- **Do not change the amber divider.** It is always `6px` wide and `#FFB000`. It is not decorative — it is a brand separator.
- **Do not skip the Google SVG.** It must be inline — do not use an icon library for it, as the four-color Google logo requires exact path colors.
