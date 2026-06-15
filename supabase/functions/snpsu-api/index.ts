import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

// ── Academic engine helpers ───────────────────────────────────────────────────
function attendanceStatus(pct: number) {
  if (pct >= 85) return "nominal";
  if (pct >= 80) return "warning";
  if (pct >= 75) return "high_warning";
  return "critical";
}

function predictedMarks(ia1: number, ia2: number, ia3: number, assignments: number) {
  const best2 = [ia1, ia2, ia3].sort((a, b) => b - a).slice(0, 2);
  return Math.min(50, best2[0] + best2[1] + assignments);
}

function recoveryAnalysis(conducted: number, attended: number) {
  const pct    = (attended / conducted) * 100;
  const target = 75;
  const frac   = target / 100;
  const needed = Math.max(0, Math.ceil(((frac * conducted) - attended) / (1 - frac)));
  const window = 14;
  const prob   = needed === 0
    ? 100
    : needed > window
      ? Math.max(0, parseFloat((100 - (needed - window) * 7.5).toFixed(2)))
      : parseFloat(((window - needed) / window * 100).toFixed(2));
  return { current_attendance: parseFloat(pct.toFixed(2)), target_attendance: target, classes_needed: needed, milestone_window: window, recovery_probability: Math.max(0, Math.min(100, prob)) };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const action = (body.action as string) ?? "";

  // ── Auth: login ─────────────────────────────────────────────────────────────
  if (action === "auth.login") {
    const { srn, password } = body as { srn: string; password: string };
    if (!srn || !password) return err("SRN and password are required.");
    const { data: student, error } = await supabase
      .from("students").select("*").eq("srn", srn.toUpperCase()).maybeSingle();
    if (error || !student) return err("Invalid SRN or password.", 401);
    if (student.password_hash !== password) return err("Invalid SRN or password.", 401);
    const initials = student.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
    return json({ status: "success", access_token: `snpsu-${student.id}-${Date.now()}`, student_meta: { name: student.name, srn: student.srn, initials } });
  }

  // ── Auth guard: all subsequent actions need a token with student id ─────────
  const authHeader = req.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.replace("Bearer ", "");
  let studentId: number | null = null;

  // Parse token format: snpsu-{id}-{ts}
  if (tokenMatch.startsWith("snpsu-")) {
    const parts = tokenMatch.split("-");
    if (parts.length >= 3) studentId = parseInt(parts[1], 10);
  }
  if (!studentId || isNaN(studentId)) return err("Unauthorized.", 401);

  // ── Student: dashboard ──────────────────────────────────────────────────────
  if (action === "student.dashboard") {
    const [{ data: attRows }, { data: markRows }, { data: notifRows }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", studentId),
      supabase.from("internal_marks").select("*").eq("student_id", studentId),
      supabase.from("notifications").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
    ]);

    const subjects = (attRows ?? []).map((a) => {
      const m = (markRows ?? []).find((x) => x.subject_code === a.subject_code) ?? { ia1: 0, ia2: 0, ia3: 0, assignments: 0 };
      const pct  = a.classes_conducted > 0 ? parseFloat(((a.classes_attended / a.classes_conducted) * 100).toFixed(2)) : 0;
      const pred = predictedMarks(m.ia1, m.ia2, m.ia3, m.assignments);
      return { id: a.id, subject_code: a.subject_code, subject_name: a.subject_name, attendance: pct, conducted: a.classes_conducted, attended: a.classes_attended, status: attendanceStatus(pct), trend: [pct - 3, pct - 1, pct, pct], ia1: m.ia1, ia2: m.ia2, ia3: m.ia3, assignments: m.assignments, predicted: pred };
    });

    const totalC = subjects.reduce((s, x) => s + x.conducted, 0);
    const totalA = subjects.reduce((s, x) => s + x.attended, 0);
    const attAvg = totalC > 0 ? parseFloat(((totalA / totalC) * 100).toFixed(2)) : 0;
    const intAvg = subjects.length > 0 ? parseFloat((subjects.reduce((s, x) => s + (x.predicted / 50) * 100, 0) / subjects.length).toFixed(2)) : 0;
    const critical = subjects.filter((s) => s.status === "critical").length;
    const score   = Math.max(0, Math.min(100, Math.round(attAvg * 0.4 + intAvg * 0.6 - critical * 10)));
    const riskLevel = attAvg < 75 || score < 50 ? "high" : attAvg < 85 || score < 70 ? "medium" : "low";
    const passProbability = parseFloat((score * 0.6 + attAvg * 0.4).toFixed(1));

    return json({
      reactor_core: { score, overall_attendance_pct: attAvg, overall_internals_pct: intAvg, risk_level: riskLevel, pass_probability: passProbability },
      subjects,
      analytics_charts: {
        attendance_trend: subjects.map((s) => ({ subject: s.subject_code.replace("25CSE", "CSE"), value: s.attendance })),
        internals_comparison: subjects.map((s) => ({ subject: s.subject_code.replace("25CSE", "CSE"), ia1: s.ia1, ia2: s.ia2, ia3: s.ia3, predicted: s.predicted, attendance: s.attendance })),
        radar_data: subjects.map((s) => ({ subject: s.subject_code.replace("25CSE", "CSE"), score: Math.round(s.attendance * 0.5 + (s.predicted / 50) * 100 * 0.5) })),
        risk_data: subjects.map((s) => ({ name: s.subject_code.replace("25CSE", "CSE"), risk: s.attendance < 75 ? 80 : s.attendance < 85 ? 40 : 10 })),
      },
      notifications: (notifRows ?? []).map((n) => ({ id: n.id, priority: n.priority, title: n.title, message: n.message, is_read: n.is_read, timestamp: n.created_at })),
    });
  }

  // ── Student: profile ────────────────────────────────────────────────────────
  if (action === "student.profile") {
    const [{ data: student }, { data: ttRows }] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
      supabase.from("timetable").select("*").eq("student_id", studentId),
    ]);
    if (!student) return err("Student not found.", 404);
    const initials = student.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
    return json({
      profile: { srn: student.srn, name: student.name, department: student.department, specialization: student.specialization, semester: student.semester, email: student.email, phone: student.phone, initials },
      timetable: (ttRows ?? []).map((t) => ({ day: t.day_of_week, slot: t.slot_time, subject: t.subject_name, room: t.room_number, instructor: t.instructor })),
    });
  }

  // ── Attendance: ledger ──────────────────────────────────────────────────────
  if (action === "attendance.ledger") {
    const { data: rows } = await supabase.from("attendance").select("*").eq("student_id", studentId);
    const records = (rows ?? []).map((a) => {
      const pct    = a.classes_conducted > 0 ? parseFloat(((a.classes_attended / a.classes_conducted) * 100).toFixed(2)) : 0;
      const status = attendanceStatus(pct);
      return { id: a.id, subject_code: a.subject_code, subject_name: a.subject_name, conducted: a.classes_conducted, attended: a.classes_attended, percentage: pct, status, recovery_analysis: status !== "nominal" ? recoveryAnalysis(a.classes_conducted, a.classes_attended) : undefined };
    });
    return json({ records });
  }

  // ── Attendance: simulate ────────────────────────────────────────────────────
  if (action === "attendance.simulate") {
    const { subject_id, additional_classes } = body as { subject_id: number; additional_classes: number };
    const { data: a } = await supabase.from("attendance").select("*").eq("id", subject_id).eq("student_id", studentId).maybeSingle();
    if (!a) return err("Subject not found.", 404);
    const newAtt  = a.classes_attended + additional_classes;
    const newCond = a.classes_conducted + additional_classes;
    const newPct  = parseFloat(((newAtt / newCond) * 100).toFixed(2));
    return json({ new_percentage: newPct, new_status: attendanceStatus(newPct) });
  }

  // ── Notifications: list ─────────────────────────────────────────────────────
  if (action === "notifications.list") {
    const { data: rows } = await supabase.from("notifications").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
    return json({ notifications: (rows ?? []).map((n) => ({ id: n.id, priority: n.priority, title: n.title, message: n.message, is_read: n.is_read, timestamp: n.created_at })) });
  }

  // ── Notifications: mark read ────────────────────────────────────────────────
  if (action === "notifications.markRead") {
    const { id } = body as { id: number };
    await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("student_id", studentId);
    return json({ status: "ok" });
  }

  // ── Insights: risk ──────────────────────────────────────────────────────────
  if (action === "insights.risk") {
    const [{ data: attRows }, { data: markRows }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", studentId),
      supabase.from("internal_marks").select("*").eq("student_id", studentId),
    ]);
    const subjects = (attRows ?? []).map((a) => {
      const m   = (markRows ?? []).find((x) => x.subject_code === a.subject_code) ?? { ia1: 0, ia2: 0, ia3: 0, assignments: 0 };
      const pct = a.classes_conducted > 0 ? (a.classes_attended / a.classes_conducted) * 100 : 0;
      return { name: a.subject_name, pct, pred: predictedMarks(m.ia1, m.ia2, m.ia3, m.assignments) };
    });
    const attAvg    = subjects.length ? subjects.reduce((s, x) => s + x.pct, 0) / subjects.length : 0;
    const intAvg    = subjects.length ? subjects.reduce((s, x) => s + (x.pred / 50) * 100, 0) / subjects.length : 0;
    const critical  = subjects.filter((s) => s.pct < 75).map((s) => s.name);
    const warning   = subjects.filter((s) => s.pct >= 75 && s.pct < 85).map((s) => s.name);
    const lowMarks  = subjects.filter((s) => s.pred < 25).map((s) => s.name);
    const coreScore = Math.max(0, Math.min(100, Math.round(attAvg * 0.4 + intAvg * 0.6 - critical.length * 10)));
    const risk      = attAvg < 75 || coreScore < 50 ? "high" : attAvg < 85 || coreScore < 70 ? "medium" : "low";
    return json({ risk_level: risk, core_score: coreScore, attendance_avg: parseFloat(attAvg.toFixed(2)), critical_subjects: critical, warning_subjects: warning, low_mark_subjects: lowMarks, recommendations: critical.length > 0 ? [`${critical.length} subject(s) in critical attendance zone.`, "Increase attendance to avoid exam debarment.", "Attend all upcoming classes without exception."] : ["Maintain current attendance levels.", "Focus on internal assessment preparation."] });
  }

  // ── Insights: weakness ──────────────────────────────────────────────────────
  if (action === "insights.weakness") {
    const [{ data: attRows }, { data: markRows }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", studentId),
      supabase.from("internal_marks").select("*").eq("student_id", studentId),
    ]);
    const weak = (attRows ?? []).reduce<{ subject: string; code: string; attendance: number; predicted_marks: number | null; risk_factors: string[] }[]>((acc, a) => {
      const m    = (markRows ?? []).find((x) => x.subject_code === a.subject_code);
      const pct  = a.classes_conducted > 0 ? parseFloat(((a.classes_attended / a.classes_conducted) * 100).toFixed(2)) : 0;
      const pred = m ? predictedMarks(m.ia1, m.ia2, m.ia3, m.assignments) : null;
      const rf   = [];
      if (pct < 75) rf.push("low_attendance");
      if (pred !== null && pred < 30) rf.push("low_marks");
      if (rf.length > 0) acc.push({ subject: a.subject_name, code: a.subject_code, attendance: pct, predicted_marks: pred, risk_factors: rf });
      return acc;
    }, []);
    return json({ weak_subjects: weak, attendance_issues: [], performance_gaps: [], suggestions: weak.map((w) => `${w.subject}: ${w.risk_factors.join(", ")} — immediate corrective action required.`) });
  }

  // ── Insights: smart ─────────────────────────────────────────────────────────
  if (action === "insights.smart") {
    const [{ data: attRows }, { data: markRows }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", studentId),
      supabase.from("internal_marks").select("*").eq("student_id", studentId),
    ]);
    const subjects = (attRows ?? []).map((a) => {
      const m   = (markRows ?? []).find((x) => x.subject_code === a.subject_code) ?? { ia1: 0, ia2: 0, ia3: 0, assignments: 0 };
      const pct = a.classes_conducted > 0 ? parseFloat(((a.classes_attended / a.classes_conducted) * 100).toFixed(2)) : 0;
      return { name: a.subject_name, pct, pred: predictedMarks(m.ia1, m.ia2, m.ia3, m.assignments) };
    });
    const bestAtt  = subjects.reduce((b, s) => s.pct > b.pct ? s : b, subjects[0] ?? { name: "-", pct: 0 });
    const worstAtt = subjects.reduce((b, s) => s.pct < b.pct ? s : b, subjects[0] ?? { name: "-", pct: 0 });
    const bestMark = subjects.reduce((b, s) => s.pred > b.pred ? s : b, subjects[0] ?? { name: "-", pred: 0 });
    const worstMk  = subjects.reduce((b, s) => s.pred < b.pred ? s : b, subjects[0] ?? { name: "-", pred: 0 });
    const above85  = subjects.filter((s) => s.pct >= 85).length;
    const avgAtt   = subjects.length ? subjects.reduce((s, x) => s + x.pct, 0) / subjects.length : 0;
    const health   = avgAtt >= 85 ? "Strong" : avgAtt >= 75 ? "Moderate" : "Weak";
    return json({ strongest_subject_attendance: { name: bestAtt.name, value: bestAtt.pct }, weakest_subject_attendance: { name: worstAtt.name, value: worstAtt.pct }, strongest_subject_marks: { name: bestMark.name, value: bestMark.pred }, weakest_subject_marks: { name: worstMk.name, value: worstMk.pred }, attendance_trend: "stable", subjects_above_85: above85, total_subjects: subjects.length, semester_health: health });
  }

  // ── Insights: planner ───────────────────────────────────────────────────────
  if (action === "insights.planner") {
    const { data: ttRows } = await supabase.from("timetable").select("*").eq("student_id", studentId);
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const plan: Record<string, { classes: string[]; study_tasks: string[] }> = {};
    for (const day of days) {
      const cls = (ttRows ?? []).filter((t) => t.day_of_week === day).map((t) => t.subject_name);
      plan[day] = { classes: cls, study_tasks: cls.length ? [`Review ${cls[cls.length - 1]} notes.`] : ["Complete pending assignments."] };
    }
    return json({ plan, narrative: "Attend all scheduled classes. Prioritise revision of subjects with attendance below 85%." });
  }

  // ── Insights: marks simulator ───────────────────────────────────────────────
  if (action === "insights.simulator") {
    const { ia1, ia2, ia3, assignments } = body as { ia1: number; ia2: number; ia3: number; assignments: number };
    const current = predictedMarks(ia1, ia2, ia3, assignments);
    const scenarios = [30, 35, 40, 45, 50].map((t) => {
      const best2  = [ia1, ia2].sort((a, b) => b - a);
      const needed = t - best2[0] - best2[1] - assignments;
      return { target: t, ia3_required: Math.max(0, Math.min(20, needed)), achievable: needed <= 20 };
    });
    return json({ current_predicted: current, improvement_scenarios: scenarios, improvement_potential: 50 - current });
  }

  // ── Chat: send ──────────────────────────────────────────────────────────────
  if (action === "chat.send") {
    const { message } = body as { message: string };
    if (!message?.trim()) return err("Message is required.");

    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
    if (!GEMINI_KEY) return json({ reply: "AI mentor is not configured — please set GEMINI_API_KEY.", role: "model" });

    // Load context
    const [{ data: attRows }, { data: markRows }, { data: hist }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", studentId),
      supabase.from("internal_marks").select("*").eq("student_id", studentId),
      supabase.from("chat_history").select("*").eq("student_id", studentId).order("created_at", { ascending: true }).limit(20),
    ]);

    const context = (attRows ?? []).map((a) => {
      const m   = (markRows ?? []).find((x) => x.subject_code === a.subject_code) ?? { ia1: 0, ia2: 0, ia3: 0, assignments: 0 };
      const pct = a.classes_conducted > 0 ? ((a.classes_attended / a.classes_conducted) * 100).toFixed(1) : "0.0";
      return `${a.subject_name}: attendance=${pct}%, IA1=${m.ia1}, IA2=${m.ia2}, IA3=${m.ia3}, assignments=${m.assignments}`;
    }).join("; ");

    const systemPrompt = `You are an academic mentor AI for SNPSU (Sapthagiri NPS University). You ONLY answer academic questions about studies, exams, attendance, performance improvement, time management, and study strategies. If the user asks anything non-academic, politely redirect to academic topics. Student data: ${context}. Be concise, helpful, and encouraging.`;

    const history = (hist ?? []).map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.message }] }));
    const contents = [...history, { role: "user", parts: [{ text: message }] }];

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents }),
    });

    const geminiData = await geminiRes.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I could not generate a response. Please try again.";

    // Persist
    await supabase.from("chat_history").insert([
      { student_id: studentId, role: "user",  message },
      { student_id: studentId, role: "model", message: reply },
    ]);

    return json({ reply, role: "model" });
  }

  // ── Chat: history ───────────────────────────────────────────────────────────
  if (action === "chat.history") {
    const { data: rows } = await supabase.from("chat_history").select("*").eq("student_id", studentId).order("created_at", { ascending: true });
    return json({ history: (rows ?? []).map((h) => ({ id: h.id, role: h.role, message: h.message, timestamp: h.created_at })) });
  }

  // ── Chat: clear ─────────────────────────────────────────────────────────────
  if (action === "chat.clear") {
    await supabase.from("chat_history").delete().eq("student_id", studentId);
    return json({ status: "ok" });
  }

  // ── AI Mentor: insights (Gemini-generated) ──────────────────────────────────
  if (action === "mentor.insights") {
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
    const [{ data: attRows }, { data: markRows }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", studentId),
      supabase.from("internal_marks").select("*").eq("student_id", studentId),
    ]);

    const context = (attRows ?? []).map((a) => {
      const m   = (markRows ?? []).find((x) => x.subject_code === a.subject_code) ?? { ia1: 0, ia2: 0, ia3: 0, assignments: 0 };
      const pct = a.classes_conducted > 0 ? ((a.classes_attended / a.classes_conducted) * 100).toFixed(1) : "0.0";
      return `${a.subject_name} (${a.subject_code}): attendance=${pct}%, IA1=${m.ia1}/20, IA2=${m.ia2}/20, IA3=${m.ia3}/20, assignments=${m.assignments}/5`;
    }).join("\n");

    if (!GEMINI_KEY) {
      return json({
        insights: {
          weakness_analysis: `Based on your data:\n${context}\n\nFocus on subjects with attendance below 85% and predicted marks below 30/50.`,
          four_week_recovery_plan: "Week 1: Attend all classes. Week 2: Submit assignments. Week 3: IA revision. Week 4: Practice papers.",
          study_directives: "1. Prioritise critical subjects.\n2. 2h daily revision blocks.\n3. Seek faculty guidance for weak topics.",
          action_plan: "1. Attend all classes.\n2. Complete pending assignments.\n3. Review IA question papers.\n4. Consult faculty for weak subjects.",
          _note: "Configure GEMINI_API_KEY for AI-generated insights.",
        },
      });
    }

    const prompt = `You are an academic mentor AI. A student has the following academic data:\n${context}\n\nGenerate 4 sections separated by headers:\n1. WEAKNESS_ANALYSIS: A 2-3 sentence analysis of the student's academic weaknesses.\n2. FOUR_WEEK_RECOVERY_PLAN: A week-by-week plan (Week 1, Week 2, Week 3, Week 4).\n3. STUDY_DIRECTIVES: 4 numbered specific study tasks.\n4. ACTION_PLAN: Top 4 high-impact action steps numbered.\n\nKeep each section concise and practical.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    function extract(text: string, key: string, next: string) {
      const re = new RegExp(`${key}[:\\s\\*]*(.*?)(?=${next}|$)`, "si");
      return (text.match(re)?.[1] ?? "").trim();
    }

    return json({
      insights: {
        weakness_analysis:        extract(raw, "WEAKNESS_ANALYSIS",      "FOUR_WEEK_RECOVERY_PLAN"),
        four_week_recovery_plan:  extract(raw, "FOUR_WEEK_RECOVERY_PLAN", "STUDY_DIRECTIVES"),
        study_directives:         extract(raw, "STUDY_DIRECTIVES",        "ACTION_PLAN"),
        action_plan:              extract(raw, "ACTION_PLAN",             "END"),
      },
    });
  }

  return err(`Unknown action: ${action}`, 404);
});
