import {
  Eye,
  EyeOff,
  Stethoscope,
  Settings,
  Heart,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/cards/Card';

export default function Privacy() {
  const { theme } = useTheme();
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>Trust &amp; Safety</h1>
      <p className={`text-body-sm mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
        For home caregivers: what we track, what we never store, and how you stay in control.
      </p>

      <Card title="What we track">
        <ul className="space-y-2 text-body-sm text-sentra-muted">
          <li className="flex gap-3">
            <Eye className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
            <span>Derived typing metrics: timing, variability, backspace ratio, session length</span>
          </li>
          <li className="flex gap-3">
            <Eye className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
            <span>Daily check-in: mood, sleep hours/quality, activity level</span>
          </li>
        </ul>
      </Card>

      <Card title="What we never store">
        <ul className="space-y-2 text-body-sm text-sentra-muted">
          <li className="flex gap-3">
            <EyeOff className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
            <span>Raw typed content. Only timing patterns are stored.</span>
          </li>
          <li className="flex gap-3">
            <EyeOff className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
            <span>Personal identifiers. Your data stays yours.</span>
          </li>
        </ul>
      </Card>

      <Card title="Not a diagnosis">
        <div className="flex gap-3">
          <Stethoscope className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
          <p className="text-body-sm text-sentra-muted">
            Sentra is <strong className="text-sentra-primary">not a medical device</strong> and does not provide a diagnosis. It is for pattern awareness only, helping caregivers notice shifts in their own wellbeing that can come with the stress of caring for someone at home.
          </p>
        </div>
      </Card>

      <Card title="User control">
        <div className="flex gap-3">
          <Settings className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
          <p className="text-body-sm text-sentra-muted">
            You control what is tracked. Data handling and retention follow your preferences; account and data control options are available.
          </p>
        </div>
      </Card>

      <Card title="Crisis resources">
        <div className="flex gap-3">
          <Heart className="w-5 h-5 flex-shrink-0 text-sentra-primary" />
          <div className="text-body-sm text-sentra-muted">
            <p className="mb-2">
              If you are a caregiver in crisis or overwhelmed, please reach out to a mental health professional or crisis resource. This app is not a substitute for professional care.
            </p>
            <p className="text-body-sm">
              (No phone numbers are listed here. Please search for local crisis or helpline services if needed.)
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
