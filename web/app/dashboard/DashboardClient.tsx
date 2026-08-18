'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getAuthProviderStatus,
  passwordSetupStorageKey,
  shouldPromptForPassword,
} from '@/lib/auth-provider'
import { emptyProfile, UserProfile } from '@/lib/profile'
import {
  getResumeParseWarning,
  getSavedResumeParseWarning,
  hasUnsavedDashboardChanges,
} from '@/lib/dashboard-state'
import { geminiApiKeyStorageKey, parseResumeWithGemini } from '@/lib/gemini-web'
import GeometricBackground from '@/components/GeometricBackground'

function canMessageExtension() {
  return typeof window !== 'undefined'
    && typeof (window as any).chrome?.runtime?.sendMessage === 'function'
}

function consumeExtensionRuntimeError(context: string) {
  const runtimeError = (window as any).chrome?.runtime?.lastError as { message?: string } | undefined
  if (!runtimeError) return false

  const message = runtimeError.message || ''
  const extensionUnavailable = /could not establish connection|receiving end does not exist|message port closed|extension context invalidated/i.test(message)
  console.warn('[extension-message] runtime failure', {
    context,
    reason: extensionUnavailable ? 'extension unavailable' : 'runtime messaging failed',
  })
  return true
}

const NAV_ITEMS = [
  { id: 'personal', label: 'Personal', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'contact', label: 'Contact', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg> },
  { id: 'address', label: 'Address', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> },
  { id: 'links', label: 'Links', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
  { id: 'education', label: 'Education', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a2 2 0 0 1-.01 2.83l-7.11 7.11a2 2 0 0 1-2.82 0l-7.11-7.11a2 2 0 0 1-.01-2.83l7.11-7.11a2 2 0 0 1 2.82 0l7.11 7.11z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg> },
  { id: 'experience', label: 'Experience', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  { id: 'skills', label: 'Skills', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { id: 'achievements', label: 'Achievements', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
  { id: 'preferences', label: 'Preferences', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg> },
] as const

type SectionId = (typeof NAV_ITEMS)[number]['id']

function Input({ label, value, onChange, type = 'text', required = false, placeholder = '', prefix = '', numericOnly = false }: any) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-foreground/70">
        {required && <span className="mr-1 text-red-500">*</span>}
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <span className="font-bold text-foreground/50">{prefix}</span>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => {
            let val = e.target.value
            if (numericOnly) val = val.replace(/[^0-9./]/g, '')
            onChange(val)
          }}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-light-accent bg-white/50 backdrop-blur-sm py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20 hover:border-accent/50 ${prefix ? 'pl-9 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, required = false }: any) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-foreground/70">
        {required && <span className="mr-1 text-red-500">*</span>}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-light-accent bg-white/50 backdrop-blur-sm px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20 hover:border-accent/50"
      >
        <option value="">Select...</option>
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function SectionCard({ id, title, children }: { id: SectionId; title: string; children: ReactNode }) {
  const navItem = NAV_ITEMS.find((item) => item.id === id);
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-light-accent bg-cards/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-accent to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_15px_var(--glow)]"></div>
      <h2 className="mb-6 border-b border-light-accent pb-4 text-xl font-extrabold text-foreground flex items-center gap-3">
        {navItem && <span className="text-primary drop-shadow-[0_0_8px_var(--soft-glow)]">{navItem.icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}

function getInitials(firstName: string, lastName: string, email: string) {
  const first = firstName.trim()
  const last = lastName.trim()
  if (first || last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function getProfileCompletion(profile: UserProfile) {
  const sectionChecks: Record<string, boolean[]> = {
    personal: [!!profile.firstName, !!profile.lastName],
    contact: [!!profile.email, !!profile.phone],
    address: [!!profile.city, !!profile.address],
    links: [!!profile.linkedin],
    education: [profile.education.length > 0],
    experience: [profile.workExperience.length > 0],
    skills: [profile.skills.length > 0],
    achievements: [!!profile.achievements],
    preferences: [!!profile.expectedSalary],
  }

  let totalChecks = 0
  let totalFilled = 0
  const remainingPerSection: Record<string, number> = {}

  for (const [sectionId, checks] of Object.entries(sectionChecks)) {
    const filled = checks.filter(Boolean).length
    totalChecks += checks.length
    totalFilled += filled
    remainingPerSection[sectionId] = checks.length - filled
  }

  const percent = Math.round((totalFilled / totalChecks) * 100)
  const remaining = totalChecks - totalFilled

  return { percent, remaining, remainingPerSection }
}

function formatName(name: string | undefined | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/).map(part => {
    if (!part) return '';
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}

function splitAndFormatName(parsedFirst: string | undefined | null, parsedMiddle: string | undefined | null, parsedLast: string | undefined | null) {
  const allParts = [parsedFirst, parsedMiddle, parsedLast]
    .filter(Boolean)
    .map(n => n!.trim())
    .join(' ')
    .split(/\s+/);
  
  let firstName = '';
  let middleName = '';
  let lastName = '';
  
  if (allParts.length === 1) {
    firstName = formatName(allParts[0]);
  } else if (allParts.length === 2) {
    firstName = formatName(allParts[0]);
    lastName = formatName(allParts[1]);
  } else if (allParts.length === 3) {
    firstName = formatName(allParts[0]);
    middleName = formatName(allParts[1]);
    lastName = formatName(allParts[2]);
  } else if (allParts.length > 3) {
    firstName = formatName(allParts[0]);
    middleName = allParts.slice(1, -1).map(formatName).join(' ');
    lastName = formatName(allParts[allParts.length - 1]);
  }
  
  return { firstName, middleName, lastName };
}

function parsePhoneAndCountryCode(rawPhone: string | undefined | null) {
  if (!rawPhone) return { phone: '', countryCode: '' };
  const clean = rawPhone.replace(/[\s\-()]/g, '');
  if (clean.length > 10) {
    return {
      phone: clean.slice(-10),
      countryCode: clean.slice(0, -10)
    };
  }
  return {
    phone: clean,
    countryCode: ''
  };
}

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea, North', 'Korea, South', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export default function DashboardClient({ userId, email, initialProfile, extensionId }: { userId: string, email: string, initialProfile: any, extensionId?: string }) {
  const supabase = createClient()
  const router = useRouter()
  
  const [localJD, setLocalJD] = useState<string>('')

  useEffect(() => {
    const extId = extensionId || process.env.NEXT_PUBLIC_EXTENSION_ID;
    if (extId && canMessageExtension()) {
      try {
        (window as any).chrome.runtime.sendMessage(
          extId,
          { type: 'GET_LOCAL_JD' },
          (response: any) => {
            if (consumeExtensionRuntimeError('Failed to load the local job description from the extension')) {
              return
            }
            if (response && response.parsedJD) {
              setLocalJD(response.parsedJD);
            }
          }
        );
      } catch (e) {
        console.error('Failed to communicate with extension for local JD', e);
      }
    }
  }, [extensionId]);

  const getInitialProfileObj = () => {
    const p = emptyProfile()
    // Map snake_case from DB to camelCase in frontend
    p.firstName = initialProfile.first_name || ''
    p.middleName = initialProfile.middle_name || ''
    p.lastName = initialProfile.last_name || ''
    p.preferredFirstName = initialProfile.preferred_first_name || ''
    p.preferredMiddleName = initialProfile.preferred_middle_name || ''
    p.preferredLastName = initialProfile.preferred_last_name || ''
    p.email = initialProfile.email || email
    p.phoneType = initialProfile.phone_type || ''
    p.countryCode = initialProfile.country_code || ''
    p.phone = initialProfile.phone || ''
    p.address = initialProfile.address || ''
    p.city = initialProfile.city || ''
    p.nationality = initialProfile.nationality || ''
    p.state = initialProfile.state || ''
    p.zip = initialProfile.zip || ''
    p.country = initialProfile.country || ''
    p.linkedin = initialProfile.linkedin || ''
    p.github = initialProfile.github || ''
    p.website = initialProfile.website || ''
    p.x = initialProfile.x || ''
    p.medium = initialProfile.medium || ''
    p.leetcode = initialProfile.leetcode || ''
    p.gfg = initialProfile.gfg || ''
    p.education = initialProfile.education ? JSON.parse(JSON.stringify(initialProfile.education)) : []
    p.workExperience = initialProfile.work_experience ? JSON.parse(JSON.stringify(initialProfile.work_experience)) : []
    p.skills = initialProfile.skills ? [...initialProfile.skills] : []
    p.languages = initialProfile.languages ? [...initialProfile.languages] : []
    p.certificates = initialProfile.certificates ? [...initialProfile.certificates] : []
    p.workAuthIndia = initialProfile.work_auth_india || ''
    p.requireSponsorship = initialProfile.require_sponsorship || ''
    p.disability = initialProfile.disability || ''
    p.veteran = initialProfile.veteran || ''
    p.gender = initialProfile.gender || ''
    p.lgbtq = initialProfile.lgbtq || ''
    p.hispanicLatino = initialProfile.hispanic_latino || ''
    p.race = initialProfile.race || ''
    p.sexualOrientation = initialProfile.sexual_orientation || ''
    p.pronouns = initialProfile.pronouns || ''
    p.expectedSalary = initialProfile.expected_salary || ''
    p.availableStartDate = initialProfile.available_start_date || ''
    p.dateOfBirth = initialProfile.date_of_birth || ''
    p.additionalInfo = initialProfile.additional_info || ''
    p.achievements = initialProfile.achievements || ''
    return p
  }

  const [profile, setProfile] = useState<UserProfile>(getInitialProfileObj)
  const [savedProfile, setSavedProfile] = useState<UserProfile>(getInitialProfileObj)
  
  const [file, setFile] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState(initialProfile.resume_path ? initialProfile.resume_path.split('/').pop() : '')
  const [saving, setSaving] = useState(false)
  const [parsingResume, setParsingResume] = useState(false)
  const [resumeParseWarning, setResumeParseWarning] = useState('')
  const [msg, setMsg] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [langInput, setLangInput] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSetPasswordPopupOpen, setIsSetPasswordPopupOpen] = useState(false)
  const [popupPassword, setPopupPassword] = useState('')
  const [popupMsg, setPopupMsg] = useState('')
  const [popupLoading, setPopupLoading] = useState(false)
  const [geminiKey, setGeminiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      // Browser localStorage only — local to this device and NOT encrypted.
      return localStorage.getItem(geminiApiKeyStorageKey(userId)) || '';
    }
    return '';
  })
  
  const [newEmail, setNewEmail] = useState('')
  const [authProvider, setAuthProvider] = useState<'google' | 'email' | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [settingsMsg, setSettingsMsg] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('personal')
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [savingGemini, setSavingGemini] = useState(false)

  // Auto-dismiss msg (used for toast notifications)
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => {
        setMsg('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [msg]);
  
  const completion = useMemo(() => getProfileCompletion(profile), [profile])
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || email.split('@')[0]
  const initials = getInitials(profile.firstName, profile.lastName, email)
  const hasUnsavedChanges = hasUnsavedDashboardChanges(profile, savedProfile, file !== null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) {
          const newActiveId = visible.target.id as SectionId;
          setActiveSection(newActiveId);
          // Scroll the sidebar navigation item into view
          const navItem = document.getElementById(`nav-${newActiveId}`);
          if (navItem) {
            navItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.3, 0.6] }
    )

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])



  useEffect(() => {
    const checkGoogleUserWithoutPassword = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Failed to determine the dashboard authentication provider:', error)
        return
      }
      if (!user) return

      const providerStatus = getAuthProviderStatus(user)
      setAuthProvider(providerStatus.authProvider)

      const setupState = localStorage.getItem(passwordSetupStorageKey(user.id))
      if (shouldPromptForPassword(user, setupState)) {
        setIsSetPasswordPopupOpen(true)
      }
    }

    checkGoogleUserWithoutPassword()
  }, [])

  const handleSetPassword = async () => {
    if (!popupPassword.trim()) {
      setPopupMsg('Please enter a password.')
      return
    }
    if (popupPassword.trim().length < 6) {
      setPopupMsg('Password must be at least 6 characters.')
      return
    }
    setPopupLoading(true)
    setPopupMsg('')
    const { error } = await supabase.auth.updateUser({
      password: popupPassword.trim()
    })
    if (error) {
      setPopupMsg(`Error: ${error.message}`)
    } else {
      setPopupMsg('Password set successfully!')
      localStorage.setItem(passwordSetupStorageKey(userId), 'completed')
      setAuthProvider('email')
      setTimeout(() => {
        setIsSetPasswordPopupOpen(false)
      }, 1500)
    }
    setPopupLoading(false)
  }

  const handleSkipPassword = () => {
    localStorage.setItem(passwordSetupStorageKey(userId), 'skipped')
    setIsSetPasswordPopupOpen(false)
  }

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSaveGeminiKey = () => {
    setSavingGemini(true)
    if (typeof window !== 'undefined') {
      // Stored only in this browser's localStorage (local-only, NOT encrypted).
      // Never synced to the extension and never logged.
      localStorage.setItem(geminiApiKeyStorageKey(userId), geminiKey)
    }
    setTimeout(() => {
      setSavingGemini(false)
      setMsg('Gemini API key saved in this browser.')
    }, 500)
  }

  const handleUpdateCredentials = async () => {
    setSettingsLoading(true)
    setSettingsMsg('')
    const updates: any = {}
    if (newEmail.trim()) updates.email = newEmail.trim()
    if (newPassword.trim()) updates.password = newPassword.trim()
    
    if (Object.keys(updates).length === 0) {
      setSettingsMsg('Please enter a new email or password.')
      setSettingsLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser(updates)
    if (error) {
      setSettingsMsg('Error: ' + error.message)
    } else {
      setSettingsMsg('Successfully updated! (If email changed, check your inbox for confirmation)')
      setNewEmail('')
      setNewPassword('')
    }
    setSettingsLoading(false)
  }

  const handleFileUpload = async (e: any) => {
    if (!e.target.files || !e.target.files[0]) return;
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setResumeName(uploadedFile.name);
    setResumeParseWarning('');
    setParsingResume(true);
    setMsg('Extracting profile from resume...');

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
        
        // Extract hyperlinks from the PDF page
        try {
          const annotations = await page.getAnnotations();
          const links = annotations
            .filter((a: any) => a.subtype === 'Link' && a.url)
            .map((a: any) => a.url);
          if (links.length > 0) {
            text += '\n[Hyperlinks found on this page:]\n' + links.join('\n') + '\n';
          }
        } catch (err) {
          console.error('Could not extract links from page', err);
        }
      }

      if (!text.trim()) {
        setMsg("We couldn't extract text from this PDF. Please make sure it is a text-selectable PDF (not a scanned image), or fill in your details manually.");
        setParsingResume(false);
        return;
      }

      // Shared: merge a parsed profile object into local dashboard state.
      const applyParsedProfile = (p: any) => {
        const phoneParsed = p.phone ? parsePhoneAndCountryCode(p.phone) : { phone: '', countryCode: '' };
        const nameInfo = (p.firstName || p.middleName || p.lastName)
          ? splitAndFormatName(p.firstName, p.middleName, p.lastName)
          : null;
        setProfile(prev => ({
          ...prev,
          firstName: nameInfo ? (nameInfo.firstName || prev.firstName) : prev.firstName,
          middleName: nameInfo ? nameInfo.middleName : prev.middleName,
          lastName: nameInfo ? (nameInfo.lastName || prev.lastName) : prev.lastName,
          email: p.email || prev.email,
          phone: p.phone ? phoneParsed.phone : prev.phone,
          countryCode: p.phone ? (phoneParsed.countryCode || prev.countryCode) : prev.countryCode,
          address: p.address || prev.address,
          city: p.city || prev.city,
          state: p.state || prev.state,
          country: p.country || prev.country,
          zip: p.zip || prev.zip,
          dateOfBirth: p.dateOfBirth || prev.dateOfBirth,
          linkedin: p.linkedin || prev.linkedin,
          github: p.github || prev.github,
          website: p.website || prev.website,
          x: p.x || prev.x,
          medium: p.medium || prev.medium,
          leetcode: p.leetcode || prev.leetcode,
          gfg: p.gfg || prev.gfg,
          education: p.education && p.education.length > 0 ? p.education : prev.education,
          workExperience: p.workExperience && p.workExperience.length > 0 ? p.workExperience : prev.workExperience,
          skills: p.skills && p.skills.length > 0 ? p.skills : prev.skills,
          languages: p.languages && p.languages.length > 0 ? p.languages : prev.languages,
          certificates: p.certificates && p.certificates.length > 0 ? p.certificates : prev.certificates,
          achievements: p.achievements || prev.achievements
        }));
      };

      // Browser-local Gemini fallback: used only when the extension is not
      // connected/healthy. The key lives in this browser's localStorage
      // (local-only, NOT encrypted) and is never logged.
      const runGeminiFallback = async () => {
        if (!geminiKey.trim()) {
          setMsg('');
          setResumeParseWarning(getResumeParseWarning(null, 'extension'));
          setParsingResume(false);
          return;
        }
        try {
          const p = await parseResumeWithGemini(text, geminiKey.trim());
          applyParsedProfile(p);
          setResumeParseWarning('');
          setMsg('Profile autofilled from resume!');
        } catch (e: any) {
          setMsg('');
          setResumeParseWarning(getResumeParseWarning(e));
        }
        setParsingResume(false);
      };

      // Prefer a healthy extension; otherwise fall back to browser-local Gemini.
      
      const extId = extensionId || process.env.NEXT_PUBLIC_EXTENSION_ID;
      if (extId && canMessageExtension()) {
        (window as any).chrome.runtime.sendMessage(extId, { type: 'PARSE_RESUME_TO_PROFILE', text }, (response: any) => {
          if (consumeExtensionRuntimeError('Failed to parse the resume with the extension')) {
            // Extension isn't reachable — try the browser-local Gemini fallback.
            void runGeminiFallback();
            return;
          }
          if (response && response.ok && response.profile) {
            applyParsedProfile(response.profile);
            setResumeParseWarning('');
            setMsg('Profile autofilled from resume!');
            setParsingResume(false);
          } else {
            // Extension responded but couldn't parse — fall back to Gemini.
            void runGeminiFallback();
          }
        });
      } else {
        // No extension connected — use the browser-local Gemini fallback.
        void runGeminiFallback();
      }
    } catch (err: any) {
      setMsg('Error parsing PDF: ' + err.message);
      setParsingResume(false);
    }
  };

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    
    let resumeText = initialProfile.resume_text || ''
    let resumePath = initialProfile.resume_path || ''

    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map((item: any) => item.str).join(' ') + '\n'
          
          try {
            const annotations = await page.getAnnotations();
            const links = annotations
              .filter((a: any) => a.subtype === 'Link' && a.url)
              .map((a: any) => a.url);
            if (links.length > 0) {
              text += '\n[Hyperlinks found on this page:]\n' + links.join('\n') + '\n';
            }
          } catch (err) {
            console.error('Could not extract links from page', err);
          }
        }
        resumeText = text
        
        if (!resumeText.trim()) {
          setMsg("We couldn't extract text from this PDF. Please make sure it is a text-selectable PDF (not a scanned image), or enter details manually.")
          setSaving(false)
          return
        }

        const filePath = `${userId}/${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, file, { upsert: true })
          
        if (uploadError) throw uploadError
        resumePath = filePath
      } catch (e: any) {
        setMsg('Error processing PDF: ' + e.message)
        setSaving(false)
        return
      }
    }

    const dbData = { 
      id: userId, email, resume_text: resumeText, resume_path: resumePath,
      first_name: profile.firstName, middle_name: profile.middleName, last_name: profile.lastName,
      preferred_first_name: profile.preferredFirstName, preferred_middle_name: profile.preferredMiddleName, preferred_last_name: profile.preferredLastName,
      phone_type: profile.phoneType, country_code: profile.countryCode, phone: profile.phone,
      address: profile.address, city: profile.city, nationality: profile.nationality, state: profile.state, zip: profile.zip, country: profile.country,
      linkedin: profile.linkedin, github: profile.github, website: profile.website,
      x: profile.x, medium: profile.medium, leetcode: profile.leetcode, gfg: profile.gfg,
      education: profile.education, work_experience: profile.workExperience, skills: profile.skills, languages: profile.languages, certificates: profile.certificates,
      work_auth_india: profile.workAuthIndia, require_sponsorship: profile.requireSponsorship, disability: profile.disability, veteran: profile.veteran,
      gender: profile.gender, lgbtq: profile.lgbtq, hispanic_latino: profile.hispanicLatino, race: profile.race, sexual_orientation: profile.sexualOrientation, pronouns: profile.pronouns,
      expected_salary: profile.expectedSalary, available_start_date: profile.availableStartDate, date_of_birth: profile.dateOfBirth, additional_info: profile.additionalInfo, achievements: profile.achievements
    }

    const { error } = await supabase.from('profiles').upsert(dbData)
    
    if (error) {
      setMsg('Error saving profile: ' + error.message)
    } else {
      setMsg('Profile saved successfully!')
      setLastSavedAt(new Date())
      setSavedProfile(profile)
      if (file && resumeParseWarning) {
        setResumeParseWarning(getSavedResumeParseWarning(resumeParseWarning))
      }
      setFile(null)
      router.refresh()
    }
    
    setSaving(false)
  }

  const handleSignOut = async () => {
    const extId = extensionId || process.env.NEXT_PUBLIC_EXTENSION_ID;
    if (extId && canMessageExtension()) {
      try {
        (window as any).chrome.runtime.sendMessage(
          extId,
          { type: 'SIGN_OUT' },
          () => {
            consumeExtensionRuntimeError('Failed to notify the extension of sign out')
          }
        )
      } catch (e) {
        console.error('Failed to notify extension of sign out', e)
      }
    }
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col h-screen bg-transparent font-sans text-foreground overflow-hidden relative">
      
      {/* Background Shapes */}
      <GeometricBackground />

      {/* Global Dashboard Header */}
      <header className="relative z-[60] mx-auto flex h-[88px] w-full max-w-[1440px] shrink-0 items-center justify-between bg-transparent px-4 py-4 pointer-events-auto sm:px-6 lg:px-8">
        {/* Left: Text Titles */}
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-[#111827] hover:opacity-80 transition-opacity">
            <img src="/applyonce_logo.svg" alt="ApplyOnce" className="h-9 w-9" />
            <span>Apply<span className="text-[#2563eb]">Once</span></span>
          </Link>
          <div className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-black/80 leading-relaxed">
            Extension /<br />Job Autofill
          </div>
        </div>

        {/* Center: Navigation Links */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-12">
          <nav className="flex items-center gap-8 text-sm font-bold tracking-widest text-black">
            <Link href="/" className="hover:text-primary transition-colors group relative">
              HOME<span className="text-primary transition-opacity opacity-0 group-hover:opacity-100 relative -top-0.5">.</span>
            </Link>
            <Link href="/dashboard" className="text-primary group relative">
              DASHBOARD<span className="text-primary relative -top-0.5">.</span>
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <span className="hidden text-sm font-bold text-slate-500 sm:block">Secure profile workspace</span>
        </div>
      </header>

      {/* Content Wrapper */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 overflow-hidden relative z-10">

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 flex flex-col z-40 bg-white border border-light-accent rounded-3xl m-8 mt-4 mb-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden relative">
        
        {/* Profile / Progress Header */}
        <div className="p-6 border-b border-light-accent/50 bg-white/50 backdrop-blur-sm relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-extrabold shadow-[0_4px_15px_var(--soft-glow)] text-lg">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-extrabold text-black">
                {displayName}
              </h2>
              <p className="truncate text-[10px] font-bold text-black/60">{email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-light-accent/30 overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out bg-primary shadow-[0_0_10px_var(--primary)]"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-primary">
              {completion.percent}%
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => {
                setActiveSection(item.id)
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`group flex w-full items-center justify-between px-6 py-3 text-sm font-extrabold transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-light-accent/10 text-primary relative'
                  : 'text-black/70 hover:bg-light-accent/5 hover:text-black'
              }`}
            >
              {activeSection === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary shadow-[0_0_8px_var(--glow)] rounded-r-md"></div>
              )}
              <div className="flex items-center gap-3">
                <span className={`transition-transform duration-200 ${activeSection === item.id ? 'scale-110 drop-shadow-[0_0_8px_var(--soft-glow)]' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              {completion.remainingPerSection[item.id] > 0 && (
                <span className="flex h-5 items-center justify-center rounded-md px-2 text-[10px] font-bold bg-light-accent/30 text-primary">
                  {completion.remainingPerSection[item.id]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Actions Bottom */}
        <div className="border-t border-light-accent/50 py-4 bg-white/50 backdrop-blur-sm space-y-2">
          {hasUnsavedChanges ? (
            <div className="px-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2563eb] to-primary py-3 text-sm font-extrabold text-white shadow-[0_4px_15px_var(--soft-glow)] hover:shadow-[0_6px_20px_var(--glow)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 border border-primary/50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 py-3 text-xs font-extrabold text-primary border-b border-light-accent/20 cursor-default mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_5px_var(--soft-glow)]"><path d="M20 6 9 17l-5-5"/></svg>
              Up to date
            </div>
          )}

          <div className="flex px-2">
            <button onClick={() => setIsSettingsOpen(true)} className="flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-bold text-black/60 hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings
            </button>
            <button onClick={() => router.push('/connect')} className="flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-bold text-black/60 hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
              Connect Extension
            </button>
            <button onClick={handleSignOut} className="flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-bold text-red-500/80 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pt-4 pb-10"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 2rem)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 2rem)'
        }}
      >
        <div className="w-full px-4 pt-0 sm:px-6 lg:px-8">
          
          {/* Top Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-6 relative">
            {/* Gemini Key Card */}
            <div className="bg-white rounded-3xl border border-light-accent p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] relative overflow-hidden group z-10">
              <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
                <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
              </div>
              <h3 className="text-sm font-extrabold text-primary flex items-center gap-2 mb-2 relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                GEMINI API KEY
              </h3>
              <p className="text-[10px] font-bold text-black/50 mb-4 max-w-[80%] relative z-10 leading-relaxed">
                Optional. Used for web-based resume parsing when the extension is not connected. Get a free key at{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">aistudio.google.com/apikey</a>
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative flex-1 bg-white rounded-xl border border-light-accent focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="........................"
                    className="w-full bg-transparent border-none text-sm font-extrabold text-black px-4 py-3 outline-none placeholder:text-black/20 tracking-widest"
                  />
                  <div 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                </div>
                <button
                  onClick={handleSaveGeminiKey}
                  disabled={savingGemini}
                  className="shrink-0 bg-gradient-to-b from-[#2563eb] to-primary text-white px-6 py-3 rounded-xl text-sm font-extrabold shadow-[0_4px_15px_var(--soft-glow)] hover:shadow-[0_6px_20px_var(--glow)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {savingGemini ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </div>

            {/* Resume Upload Card */}
            <div className="bg-white rounded-3xl border border-light-accent p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] relative z-10">
              <h3 className="text-sm font-extrabold text-primary flex items-center gap-2 mb-2 relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
                UPLOAD RESUME
              </h3>
              <p className="text-[10px] font-bold text-black/50 mb-4 relative z-10 w-[70%] leading-relaxed">
                PDF only. Autofills your profile from resume content.
              </p>
              
              <div className="flex items-center gap-3 bg-white rounded-xl p-2 border border-light-accent relative z-10 shadow-sm mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500 text-[11px] font-extrabold text-white shadow-sm shadow-red-500/20">
                    PDF
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-black">
                      {resumeName || 'No resume uploaded'}
                    </p>
                    <p className="text-[10px] font-bold text-black/40">
                      {resumeName ? 'Ready to save' : 'Select a file'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pr-1">
                  <label className="shrink-0 cursor-pointer rounded-xl border border-primary bg-white px-5 py-2.5 text-xs font-extrabold text-primary hover:bg-light-accent/10 hover:shadow-[0_0_15px_var(--soft-glow)] transition-all active:scale-95 text-center">
                    {parsingResume ? 'PARSING...' : (resumeName ? 'REPLACE' : 'UPLOAD')}
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={parsingResume} />
                  </label>
                  {resumeName && (
                    <button
                      onClick={() => {
                        setFile(null)
                        setResumeName('')
                        setResumeParseWarning('')
                        setMsg('')
                      }}
                      className="p-2 text-black/30 hover:text-red-500 rounded-lg transition-colors"
                      title="Remove resume"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                </div>
              </div>
              {resumeParseWarning && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900" role="status">
                  <svg className="mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <p className="text-[10px] font-bold leading-relaxed">{resumeParseWarning}</p>
                </div>
              )}
              <p className="text-[10px] font-bold text-black/40 leading-relaxed relative z-10">
                By uploading, you consent to ApplyOnce processing and storing your resume text to enable smart job autofilling.
              </p>
            </div>

            {/* Active Job Description Card */}
            {localJD && (
              <div className="bg-white rounded-3xl border border-light-accent p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] relative z-10 lg:col-span-2">
                <h3 className="text-sm font-extrabold text-primary flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  ACTIVE JOB DESCRIPTION (FROM EXTENSION)
                </h3>
                <p className="text-[10px] font-bold text-black/50 mb-4 leading-relaxed">
                  Automatically synchronized from your extension&apos;s local storage. Not stored on servers.
                </p>
                <div className="text-xs font-semibold text-black/85 whitespace-pre-line leading-relaxed bg-[#f8fafc] border border-light-accent/50 p-4 rounded-xl max-h-60 overflow-y-auto custom-scrollbar">
                  {localJD}
                </div>
              </div>
            )}
          </div>

          {/* Form Sections */}
          <div className="space-y-6 pb-32">
            <SectionCard id="personal" title="Personal Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input label="First Name" required value={profile.firstName} onChange={(v: string) => setProfile({...profile, firstName: v})} placeholder="e.g. John" />
          <Input label="Middle Name" value={profile.middleName} onChange={(v: string) => setProfile({...profile, middleName: v})} placeholder="e.g. Robert" />
          <Input label="Last Name" required value={profile.lastName} onChange={(v: string) => setProfile({...profile, lastName: v})} placeholder="e.g. Doe" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input label="Preferred First Name" value={profile.preferredFirstName} onChange={(v: string) => setProfile({...profile, preferredFirstName: v})} placeholder="e.g. Johnny" />
          <Input label="Preferred Middle Name" value={profile.preferredMiddleName} onChange={(v: string) => setProfile({...profile, preferredMiddleName: v})} placeholder="e.g. Rob" />
          <Input label="Preferred Last Name" value={profile.preferredLastName} onChange={(v: string) => setProfile({...profile, preferredLastName: v})} placeholder="e.g. Doe" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={(v: string) => setProfile({...profile, dateOfBirth: v})} />
        </div>
            </SectionCard>

            <SectionCard id="contact" title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Email Address" required type="email" value={profile.email} onChange={(v: string) => setProfile({...profile, email: v})} placeholder="john.doe@example.com" />
          <Select label="Phone Type" value={profile.phoneType} onChange={(v: string) => setProfile({...profile, phoneType: v})} options={['Mobile', 'Home', 'Work']} />
          <div className="flex gap-2">
            <div className="w-1/3">
              <Select 
                label="Code" 
                value={profile.countryCode} 
                onChange={(v: string) => setProfile({...profile, countryCode: v})} 
                options={['+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91', '+92', '+234', '+254', '+351', '+353', '+358', '+380', '+420', '+880', '+966', '+971', '+972']} 
              />
            </div>
            <div className="w-2/3"><Input label="Phone" required value={profile.phone} onChange={(v: string) => setProfile({...profile, phone: v})} placeholder="1234567890" numericOnly /></div>
          </div>
        </div>
            </SectionCard>

            <SectionCard id="address" title="Address">
        <div className="mb-4">
          <Input label="Address Line" value={profile.address} onChange={(v: string) => setProfile({...profile, address: v})} placeholder="123 Main St, Apt 4B" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Select label="Country" value={profile.country} onChange={(v: string) => setProfile({...profile, country: v})} options={COUNTRIES} />
          <Input label="State/Province" value={profile.state} onChange={(v: string) => setProfile({...profile, state: v})} placeholder="e.g. Maharashtra, CA" />
          <Input label="City" required value={profile.city} onChange={(v: string) => setProfile({...profile, city: v})} placeholder="e.g. Mumbai, San Francisco" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Nationality/Citizenship" value={profile.nationality} onChange={(v: string) => setProfile({...profile, nationality: v})} options={COUNTRIES} />
          <Input label="Postal Code" value={profile.zip} onChange={(v: string) => setProfile({...profile, zip: v})} placeholder="e.g. 400001, 94105" numericOnly />
        </div>
            </SectionCard>

            <SectionCard id="links" title="Links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="LinkedIn URL" value={profile.linkedin} onChange={(v: string) => setProfile({...profile, linkedin: v})} placeholder="https://linkedin.com/in/johndoe" />
          <Input label="GitHub URL" value={profile.github} onChange={(v: string) => setProfile({...profile, github: v})} placeholder="https://github.com/johndoe" />
          <Input label="Website/Portfolio URL" value={profile.website} onChange={(v: string) => setProfile({...profile, website: v})} placeholder="https://johndoe.com" />
          <Input label="X (Twitter) URL" value={profile.x} onChange={(v: string) => setProfile({...profile, x: v})} placeholder="https://x.com/johndoe" />
          <Input label="Medium URL" value={profile.medium} onChange={(v: string) => setProfile({...profile, medium: v})} placeholder="https://medium.com/@johndoe" />
          <Input label="LeetCode URL" value={profile.leetcode} onChange={(v: string) => setProfile({...profile, leetcode: v})} placeholder="https://leetcode.com/u/johndoe" />
          <Input label="GeeksforGeeks URL" value={profile.gfg} onChange={(v: string) => setProfile({...profile, gfg: v})} placeholder="https://auth.geeksforgeeks.org/user/johndoe" />
        </div>
            </SectionCard>

            <SectionCard id="education" title="Education">
        {profile.education.map((edu, i) => (
          <div key={i} className="relative mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <button onClick={() => setProfile({...profile, education: profile.education.filter((_, idx) => idx !== i)})} className="absolute top-3 right-3 text-sm font-bold text-red-500 hover:text-red-700">Remove</button>
            <h3 className="font-bold mb-4 text-gray-900">Education {i + 1}</h3>
            <div className="mb-4"><Input label="College Name" required value={edu.collegeName} onChange={(v: string) => { const e = profile.education.map((item, idx) => idx === i ? { ...item, collegeName: v } : item); setProfile({...profile, education: e}) }} placeholder="e.g. Stanford University, IIT Bombay" /></div>
            <div className="mb-4"><Input label="Branch/Specialization" value={edu.branch || ''} onChange={(v: string) => { const e = profile.education.map((item, idx) => idx === i ? { ...item, branch: v } : item); setProfile({...profile, education: e}) }} placeholder="e.g. Computer Science, Mechanical Engineering" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Accreditation (Degree)" required value={edu.degree} onChange={(v: string) => { const e = profile.education.map((item, idx) => idx === i ? { ...item, degree: v } : item); setProfile({...profile, education: e}) }} placeholder="e.g. B.S. Computer Science, B.Tech" />
              <Input label="GPA" value={edu.gpa} onChange={(v: string) => { const e = profile.education.map((item, idx) => idx === i ? { ...item, gpa: v } : item); setProfile({...profile, education: e}) }} placeholder="e.g. 3.8/4.0, 8.5/10" numericOnly />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Start Date" value={edu.startDate} onChange={(v: string) => { const e = profile.education.map((item, idx) => idx === i ? { ...item, startDate: v } : item); setProfile({...profile, education: e}) }} placeholder="e.g. Aug 2018, 08/2018" />
              <div>
                <Input label="End Date" value={edu.endDate} onChange={(v: string) => { const e = profile.education.map((item, idx) => idx === i ? { ...item, endDate: v } : item); setProfile({...profile, education: e}) }} placeholder="e.g. May 2022, Present" />
                <label className="flex items-center mt-2 text-sm font-medium text-black/70">
                  <input type="checkbox" checked={edu.currentlyStudyHere} onChange={(e) => { const ed = profile.education.map((item, idx) => idx === i ? { ...item, currentlyStudyHere: e.target.checked } : item); setProfile({...profile, education: ed}) }} className="mr-2 rounded border-light-accent text-primary focus:ring-primary/20" />
                  I currently study here
                </label>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => setProfile({...profile, education: [...profile.education, { collegeName: '', branch: '', degree: '', gpa: '', startDate: '', endDate: '', currentlyStudyHere: false }]})} className="rounded-xl border border-light-accent bg-white px-4 py-2 text-sm font-extrabold text-primary hover:bg-light-accent/10 transition-colors shadow-sm">+ Add Education</button>
            </SectionCard>

            <SectionCard id="experience" title="Work Experience">
        {profile.workExperience.map((work, i) => (
          <div key={i} className="relative mb-6 rounded-2xl border border-light-accent bg-white/50 p-6 shadow-sm">
            <button onClick={() => setProfile({...profile, workExperience: profile.workExperience.filter((_, idx) => idx !== i)})} className="absolute top-4 right-4 text-sm font-extrabold text-red-500 hover:text-red-700 transition-colors">Remove</button>
            <h3 className="font-extrabold mb-4 text-black">Work Experience {i + 1}</h3>
            <div className="mb-4"><Input label="Company" required value={work.company} onChange={(v: string) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, company: v } : item); setProfile({...profile, workExperience: w}) }} placeholder="e.g. Google, TCS" /></div>
            <div className="mb-4"><Input label="Job Title" required value={work.jobTitle} onChange={(v: string) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, jobTitle: v } : item); setProfile({...profile, workExperience: w}) }} placeholder="e.g. Software Engineer" /></div>
            <div className="mb-4"><Input label="Location" value={work.location} onChange={(v: string) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, location: v } : item); setProfile({...profile, workExperience: w}) }} placeholder="e.g. Remote, Bangalore" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Start Date" value={work.startDate} onChange={(v: string) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, startDate: v } : item); setProfile({...profile, workExperience: w}) }} placeholder="e.g. Jun 2022" />
              <div>
                <Input label="End Date" value={work.endDate} onChange={(v: string) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, endDate: v } : item); setProfile({...profile, workExperience: w}) }} placeholder="e.g. Present" />
                <label className="flex items-center mt-2 text-sm font-medium text-black/70">
                  <input type="checkbox" checked={work.currentlyWorkHere} onChange={(e) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, currentlyWorkHere: e.target.checked } : item); setProfile({...profile, workExperience: w}) }} className="mr-2 rounded border-light-accent text-primary focus:ring-primary/20" />
                  I currently work here
                </label>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-black/70 mb-1.5">Experience Summary</label>
              <textarea value={work.summary} onChange={(e) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, summary: e.target.value } : item); setProfile({...profile, workExperience: w}) }} placeholder="Brief overview of your role..." className="w-full rounded-xl border border-light-accent bg-white px-4 py-3 text-sm font-medium text-black outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/50" rows={2}></textarea>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-widest text-black/70 mb-2">Job Description (Bullets)</label>
              {work.bullets.map((bullet, bIdx) => (
                <div key={bIdx} className="flex gap-2 mb-2">
                  <input type="text" value={bullet} onChange={(e) => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, bullets: item.bullets.map((b, bI) => bI === bIdx ? e.target.value : b) } : item); setProfile({...profile, workExperience: w}) }} placeholder="e.g. Developed scalable microservices using Node.js..." className="flex-1 rounded-xl border border-light-accent bg-white px-4 py-2 text-sm font-medium text-black outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/50" />
                  <button onClick={() => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, bullets: item.bullets.filter((_, idx) => idx !== bIdx) } : item); setProfile({...profile, workExperience: w}) }} className="px-3 text-black/40 hover:text-red-500 transition-colors">✕</button>
                </div>
              ))}
              <button onClick={() => { const w = profile.workExperience.map((item, idx) => idx === i ? { ...item, bullets: [...item.bullets, ''] } : item); setProfile({...profile, workExperience: w}) }} className="px-4 py-2 mt-2 border border-light-accent rounded-xl text-xs font-extrabold text-primary bg-white hover:bg-light-accent/10 transition-colors shadow-sm">+ Add Bullet Point</button>
            </div>
          </div>
        ))}
        <button onClick={() => setProfile({...profile, workExperience: [...profile.workExperience, { company: '', jobTitle: '', location: '', startDate: '', endDate: '', currentlyWorkHere: false, summary: '', bullets: [] }]})} className="rounded-xl border border-light-accent bg-white px-4 py-2 text-sm font-extrabold text-primary hover:bg-light-accent/10 transition-colors shadow-sm">+ Add Work Experience</button>
            </SectionCard>

            <SectionCard id="skills" title="Skills & Languages">
        <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-black/70">Skills</h3>
        <div className="mb-6 flex flex-wrap gap-2">
          {profile.skills.map((skill, i) => (
            <span key={i} className="flex items-center gap-2 rounded-full border border-light-accent bg-light-accent/10 px-3 py-1.5 text-xs font-bold text-black shadow-sm">
              {skill}
              <button onClick={() => setProfile({...profile, skills: profile.skills.filter((_, idx) => idx !== i)})} className="font-bold text-black/40 hover:text-red-500 transition-colors">&#10005;</button>
            </span>
          ))}
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="Add a skill and press Enter..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && skillInput.trim()) {
                e.preventDefault()
                if (!profile.skills.includes(skillInput.trim())) {
                  setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] })
                }
                setSkillInput('')
              }
            }}
            className="w-64 rounded-full border border-light-accent bg-white px-4 py-1.5 text-xs font-bold text-black outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/50"
          />
        </div>

        <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-black/70">Languages (Max 3)</h3>
        <div className="mb-6 flex flex-wrap gap-2">
          {profile.languages.map((lang, i) => (
            <span key={i} className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
              {lang}
              <button onClick={() => setProfile({...profile, languages: profile.languages.filter((_, idx) => idx !== i)})} className="font-bold text-primary/60 hover:text-red-500 transition-colors">&#10005;</button>
            </span>
          ))}
          {profile.languages.length < 3 && (
            <div className="relative">
              <input
                list="language-options"
                type="text"
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                placeholder="Add a language..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && langInput.trim()) {
                    e.preventDefault()
                    if (!profile.languages.includes(langInput.trim())) {
                      setProfile({ ...profile, languages: [...profile.languages, langInput.trim()] })
                    }
                    setLangInput('')
                  }
                }}
                className="w-48 rounded-full border border-light-accent bg-white px-4 py-1.5 text-xs font-bold text-black outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/50"
              />
              <datalist id="language-options">
                <option value="English" />
                <option value="Hindi" />
                <option value="Japanese" />
                <option value="Spanish" />
                <option value="French" />
                <option value="German" />
                <option value="Mandarin" />
                <option value="Arabic" />
                <option value="Russian" />
                <option value="Portuguese" />
              </datalist>
            </div>
          )}
        </div>

        <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-black/70 mt-6">Certificates (Max 3)</h3>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              label={`Certificate Link ${i + 1}`}
              value={profile.certificates[i] || ''}
              onChange={(v: string) => {
                const newCerts = [...profile.certificates]
                newCerts[i] = v
                setProfile({ ...profile, certificates: newCerts })
              }}
              placeholder="https://..."
            />
          ))}
        </div>
            </SectionCard>

            <SectionCard id="achievements" title="Achievements">
          <textarea
            value={profile.achievements}
            onChange={(e) => setProfile({ ...profile, achievements: e.target.value })}
            placeholder="List your key achievements, awards, or publications..."
            className="w-full rounded-xl border border-light-accent bg-white px-4 py-3 text-sm font-medium text-black outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/50"
            rows={4}
          />
            </SectionCard>

            <SectionCard id="preferences" title="Preferences & EEO">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Expected Annual Salary" value={profile.expectedSalary} onChange={(v: string) => setProfile({...profile, expectedSalary: v})} prefix="₹" placeholder="in LPA" numericOnly />
          <Input label="When can you start your next job?" value={profile.availableStartDate} onChange={(v: string) => setProfile({...profile, availableStartDate: v})} placeholder="e.g. Immediately, 2 weeks notice" />
        </div>
        <div className="mb-6">
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-black/70">Anything else we should know?</label>
          <textarea value={profile.additionalInfo} onChange={(e) => setProfile({...profile, additionalInfo: e.target.value})} placeholder="For example: work authorization, availability, relocation preferences..." className="w-full rounded-xl border border-light-accent bg-white px-4 py-3 text-sm font-medium text-black outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/20 hover:border-accent/50" rows={4} />
        </div>
        <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-black/70">EEO & Diversity</h3>
        <p className="mb-4 text-[10px] text-black/50 font-bold leading-normal">
          Providing demographic information is completely optional. By filling out these fields, you consent to this data being stored and used solely for autofilling job applications.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Are you authorized to work in the India?" value={profile.workAuthIndia} onChange={(v: string) => setProfile({...profile, workAuthIndia: v})} options={['Yes', 'No']} />
          <Select label="Will you require sponsorship?" value={profile.requireSponsorship} onChange={(v: string) => setProfile({...profile, requireSponsorship: v})} options={['Yes', 'No']} />
          <Select label="Do you have a disability?" value={profile.disability} onChange={(v: string) => setProfile({...profile, disability: v})} options={['Yes', 'No', 'Decline to state']} />
          <Select label="Are you a veteran?" value={profile.veteran} onChange={(v: string) => setProfile({...profile, veteran: v})} options={['Yes', 'No', 'Decline to state']} />
          <Select label="What is your gender?" value={profile.gender} onChange={(v: string) => setProfile({...profile, gender: v})} options={['Female', 'Male', 'Non-binary', 'Decline to state']} />
          <Select label="Do you identify as LGBTQ+?" value={profile.lgbtq} onChange={(v: string) => setProfile({...profile, lgbtq: v})} options={['Yes', 'No', 'Decline to state']} />
          <Select label="Are you Hispanic/Latino?" value={profile.hispanicLatino} onChange={(v: string) => setProfile({...profile, hispanicLatino: v})} options={['Yes', 'No', 'Decline to state']} />
          <Select label="How would you identify your race?" value={profile.race} onChange={(v: string) => setProfile({...profile, race: v})} options={['Asian', 'Black or African American', 'White', 'Native American', 'Two or More Races', 'Decline to state']} />
          <Select label="Sexual Orientation" value={profile.sexualOrientation} onChange={(v: string) => setProfile({...profile, sexualOrientation: v})} options={['Heterosexual', 'Homosexual', 'Bisexual', 'Decline to state']} />
          <Select label="Pronouns" value={profile.pronouns} onChange={(v: string) => setProfile({...profile, pronouns: v})} options={['He/Him', 'She/Her', 'They/Them', 'Other']} />
        </div>
            </SectionCard>
          </div>

          <p className="pb-6 text-center text-xs font-bold text-black/30">Made by Surya Pratap Singh</p>
        </div>
      </main>
      </div>

      {hasUnsavedChanges && (
        <div className="fixed bottom-8 left-0 right-0 z-40 flex pointer-events-none justify-center lg:left-72">
          <div className="w-full max-w-5xl flex justify-end px-4 md:px-6">
            <div className="animate-fade-in-up pointer-events-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#2563eb] to-primary px-8 py-3.5 text-sm font-extrabold text-white shadow-[0_0_20px_var(--glow)] transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_var(--glow)] disabled:pointer-events-none disabled:opacity-50 border border-[#2563eb]"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-[#e2e8f0] relative">
            {/* Top Close (x) Button */}
            <button 
              type="button" 
              onClick={() => { setIsSettingsOpen(false); setSettingsMsg(''); }}
              className="absolute top-6 right-6 p-2 text-black/40 hover:text-black transition-colors bg-white hover:bg-black/5 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            {/* Header */}
            <div className="mb-6 flex flex-col items-start w-full pr-8">
              <h2 className="text-2xl font-extrabold text-black">Profile <span className="text-primary">Settings</span></h2>
              <p className="text-xs font-bold text-black/40 mt-1">Manage your account authentication details.</p>
              
              {/* Account Status Badge */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/50">Provider:</span>
                {authProvider === 'google' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20">
                    <svg viewBox="0 0 24 24" width="10" height="10" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2563eb]/10 text-primary border border-[#2563eb]/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Email Credentials
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-[11px] font-extrabold text-black mb-2">Update Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/60">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <input
                    type="email"
                    value={authProvider === 'google' ? email : newEmail}
                    disabled={authProvider === 'google'}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder={authProvider === 'google' ? email : "New email address"}
                    className={`block w-full rounded-xl border border-light-accent bg-white px-4 py-3 pl-11 text-sm font-bold text-black placeholder:text-black/30 outline-none transition-all ${
                      authProvider === 'google' 
                        ? 'cursor-not-allowed bg-gray-50 text-black/40 border-light-accent/50' 
                        : 'focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-accent'
                    }`}
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div>
                <label className="block text-[11px] font-extrabold text-black mb-2">Update Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/60">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    disabled={authProvider === 'google'}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={authProvider === 'google' ? "Managed by Google OAuth" : "New password (min 6 chars)"}
                    className={`block w-full rounded-xl border border-light-accent bg-white px-4 py-3 pl-11 text-sm font-bold text-black placeholder:text-black/30 outline-none transition-all ${
                      authProvider === 'google' 
                        ? 'cursor-not-allowed bg-gray-50 text-black/40 border-light-accent/50' 
                        : 'focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-accent'
                    }`}
                  />
                </div>
                {authProvider === 'google' && (
                  <p className="mt-2 text-[10px] font-bold text-gray-400 leading-normal">
                    Email and password settings are managed by Google.
                  </p>
                )}
              </div>

              {authProvider !== 'google' && (
                <button 
                  onClick={handleUpdateCredentials}
                  disabled={settingsLoading}
                  className="w-full bg-gradient-to-b from-[#2563eb] to-primary text-white py-3.5 rounded-xl font-extrabold shadow-[0_4px_15px_rgba(37, 99, 235,0.15)] hover:shadow-[0_6px_20px_rgba(37, 99, 235,0.25)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {settingsLoading ? 'Updating Credentials...' : 'Update Credentials'}
                </button>
              )}
              
              {settingsMsg && (
                <p className={`text-center text-sm font-bold mt-2 ${settingsMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                  {settingsMsg}
                </p>
              )}

              {/* Danger Zone / Log Out Action */}
              <div className="pt-4 border-t border-light-accent flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.push('/?login=true')
                    router.refresh()
                  }}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSetPasswordPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
            <div className="mb-4 flex justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Set Account Password</h2>
            <p className="mb-6 text-sm font-semibold text-gray-500 max-w-[320px] mx-auto leading-relaxed">
              Create a local password so you can also log in manually with your email if you ever lose access to Google.
            </p>
            
            <div className="mb-6 text-left">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-foreground/70 mb-2">Password</label>
              <input
                type="password"
                value={popupPassword}
                onChange={e => setPopupPassword(e.target.value)}
                placeholder="Choose password (min 6 chars)"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none font-bold"
              />
            </div>

            <button 
              onClick={handleSetPassword}
              disabled={popupLoading}
              className="mb-4 w-full rounded-lg bg-gradient-to-b from-[#2563eb] to-primary px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 shadow-md transition-all"
            >
              {popupLoading ? 'Setting Password...' : 'Set Password'}
            </button>

            <button 
              onClick={handleSkipPassword}
              disabled={popupLoading}
              className="w-full text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip, I will do it later in profile settings
            </button>
            
            {popupMsg && (
              <p className={`text-sm font-bold mt-4 ${popupMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {popupMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Glassmorphic Toast Notifications */}
      {msg && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="bg-white/70 backdrop-blur-md border border-light-accent px-6 py-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex items-center gap-4 max-w-sm">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.toLowerCase().includes('error') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-[#2563eb]'}`}>
              {msg.toLowerCase().includes('error') ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-extrabold tracking-wider uppercase ${msg.toLowerCase().includes('error') ? 'text-red-500' : 'text-primary'}`}>
                {msg.toLowerCase().includes('error') ? 'Error' : 'Notification'}
              </p>
              <p className="text-[12px] font-bold text-black/75 leading-relaxed mt-0.5 whitespace-pre-wrap">
                {msg}
              </p>
            </div>
            <button 
              onClick={() => setMsg('')}
              className="text-black/30 hover:text-black transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
