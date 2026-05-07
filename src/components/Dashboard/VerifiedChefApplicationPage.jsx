import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock3, FileUp, Send, Sparkles, XCircle } from 'lucide-react';

const initialForm = {
  full_name: '',
  biography: '',
  cooking_experience: '',
  education: '',
  certificates: '',
  awards: '',
  professional_experience: '',
  portfolio_url: '',
  cv_text: '',
};

const inputClass = 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600';

const Field = ({ label, helper, children }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block">{label}</label>
    {children}
    {helper && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">{helper}</p>}
  </div>
);

const TextInput = ({ value, onChange, placeholder, required }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputClass} />
);

const TextArea = ({ value, onChange, placeholder, rows = 3, required }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} required={required} className={`${inputClass} resize-y`} />
);

const FileInput = ({ label, file, onChange, helper }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block">{label}</label>
    <label className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-4 cursor-pointer hover:border-emerald-500 transition-all">
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-700 dark:text-slate-200 truncate">{file ? file.name : 'Choose file'}</span>
        <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">{helper}</span>
      </span>
      <FileUp size={18} className="text-emerald-600 dark:text-emerald-300 flex-shrink-0" />
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} className="hidden" />
    </label>
  </div>
);

const StatusPanel = ({ application }) => {
  if (!application) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <Clock3 size={22} className="text-slate-400 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">No application yet</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-6">Send one clear application. Admins review it and approve Verified Chef access for challenge creation.</p>
      </div>
    );
  }

  const tone = {
    pending: 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800',
    rejected: 'bg-red-50 text-red-800 border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800',
  }[application.status];

  const Icon = application.status === 'approved' ? CheckCircle2 : application.status === 'rejected' ? XCircle : Clock3;

  return (
    <div className={`border rounded-3xl p-6 shadow-sm ${tone}`}>
      <Icon size={24} />
      <p className="text-xs font-black uppercase tracking-widest mt-4">Application {application.status}</p>
      <p className="text-sm font-medium mt-2">Submitted {new Date(application.submitted_at).toLocaleDateString()}</p>
      {application.admin_note && (
        <div className="mt-5 bg-white/60 dark:bg-slate-950/20 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Admin note</p>
          <p className="text-sm leading-6">{application.admin_note}</p>
        </div>
      )}
    </div>
  );
};

export const VerifiedChefApplicationPage = ({ user, setUser }) => {
  const [form, setForm] = useState(initialForm);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my/verified-chef-application?userId=${user.id}`);
      const data = await res.json();
      setApplication(data);
    } catch {
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchApplication();
  }, [user?.id]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const refreshRole = async () => {
    const res = await fetch(`/api/users/${user.id}/role`);
    if (!res.ok) return;
    const data = await res.json();
    setUser({ id: data.user_id, name: data.username, username: data.username, email: data.email, role: data.role });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    if (!cvFile || !certificateFile) {
      setMessage('Please upload both a CV file and a certificate file before submitting.');
      setSubmitting(false);
      return;
    }

    try {
      const body = new FormData();
      body.append('userId', user.id);
      Object.entries(form).forEach(([key, value]) => body.append(key, value || ''));
      if (cvFile) body.append('cv_file', cvFile);
      if (certificateFile) body.append('certificate_file', certificateFile);

      const res = await fetch('/api/verified-chef-applications', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Application could not be submitted.');
      setApplication(data);
      setForm(initialForm);
      setCvFile(null);
      setCertificateFile(null);
      setMessage('Application submitted. An admin can now review it.');
      await refreshRole();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === 'Verified Chef') {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-3xl p-8 shadow-sm">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-300 mb-4" size={30} />
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Verified Chef Approved</h1>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 leading-6">
            You can now create Kitchen Challenges while keeping your Home Cook recipe and royalty abilities.
          </p>
        </div>
      </div>
    );
  }

  const hasPending = application?.status === 'pending';

  return (
    <div className="py-10 max-w-6xl mx-auto">
      <header className="mb-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400 mb-3">Verified Chef</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Apply for Verification</h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-7 max-w-2xl">
            A short professional profile is enough. Admins mainly need to see who you are, your cooking background, and proof they can review.
          </p>
        </div>
        {loading ? (
          <div className="animate-pulse text-xs font-bold uppercase tracking-widest text-slate-400">Loading status...</div>
        ) : (
          <StatusPanel application={application} />
        )}
      </header>

      {hasPending ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 shadow-sm">
          <Clock3 className="text-amber-500 mb-4" size={28} />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Your application is waiting for admin review.</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-6">You do not need to submit another one. If approved, your account becomes a Verified Chef and challenge creation unlocks.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-5 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-6">
            <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Essentials</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Keep it clear and reviewable.</p>
                </div>
              </div>

              <Field label="Full name">
                <TextInput value={form.full_name} onChange={(value) => update('full_name', value)} placeholder="Your real name" required />
              </Field>

              <Field label="Short chef bio" helper="Two or three sentences is perfect.">
                <TextArea value={form.biography} onChange={(value) => update('biography', value)} placeholder="What kind of cooking do you do? What should admins know about your style?" rows={4} required />
              </Field>

              <Field label="Cooking experience" helper="Mention years, kitchens, events, recipe work, teaching, or serious home cooking.">
                <TextArea value={form.cooking_experience} onChange={(value) => update('cooking_experience', value)} placeholder="Example: 3 years of Mediterranean cooking, private dinner events, and weekly recipe publishing..." rows={5} required />
              </Field>

              <Field label="Professional experience">
                <TextArea value={form.professional_experience} onChange={(value) => update('professional_experience', value)} placeholder="Restaurants, catering, internships, workshops, food content, or related work." rows={4} />
              </Field>
            </section>

            <div className="space-y-6">
              <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Proof</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Optional, but helps approval.</p>
                  </div>
                </div>

                <Field label="Education">
                  <TextArea value={form.education} onChange={(value) => update('education', value)} placeholder="School, culinary courses, colleges, certificates in progress..." rows={3} />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5">
                  <Field label="Certificates">
                    <TextArea value={form.certificates} onChange={(value) => update('certificates', value)} placeholder="Food safety, culinary certificates, workshops..." rows={3} />
                  </Field>
                  <Field label="Awards">
                    <TextArea value={form.awards} onChange={(value) => update('awards', value)} placeholder="Competitions, recognition, media mentions..." rows={3} />
                  </Field>
                </div>
              </section>

              <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <FileUp size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Documents</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">CV and certificate are required. Max 5 MB each.</p>
                  </div>
                </div>

                <Field label="Portfolio / social link">
                  <TextInput value={form.portfolio_url} onChange={(value) => update('portfolio_url', value)} placeholder="https://instagram.com/yourfoodpage" />
                </Field>

                <FileInput label="CV file *" file={cvFile} onChange={setCvFile} helper="PDF, JPG, PNG, or WEBP — required" />

                <FileInput label="Certificate file *" file={certificateFile} onChange={setCertificateFile} helper="Certificate PDF/image — required" />

                <Field label="Extra notes" helper="Optional. Paste CV highlights if you do not want to upload a CV.">
                  <TextArea value={form.cv_text} onChange={(value) => update('cv_text', value)} placeholder="Education, work history, certificate details, awards..." rows={4} />
                </Field>
              </section>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <button disabled={submitting || !cvFile || !certificateFile} className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            {message && <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{message}</p>}
          </div>
        </form>
      )}
    </div>
  );
};
