"use client";

import { CheckCircle2, MessageSquareWarning, Star, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const reasons = ["Rider was rude", "Rider was unprofessional", "Rider requested extra money", "Rider damaged my package", "Rider did not follow instructions", "Rider was too late", "Rider behaved inappropriately", "Other"];

export function DeliveryFeedback({ token, order }: { token: string; order: { status: string; rider?: { name?: string } | null; rating?: { rating: number; comment?: string | null } | null; riderRating?: { rating: number; comment?: string | null } | null; report?: { id: string } | null; riderReport?: { id: string } | null } }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const savedRating = order.rating || order.riderRating;
  const hasReport = Boolean(order.report || order.riderReport);
  const ratingMutation = useMutation({ mutationFn: () => api.submitDeliveryRating(token, { rating, comment: comment.trim() || undefined }), onSuccess: () => { setMessage("Thank you for rating your delivery."); queryClient.invalidateQueries({ queryKey: ["customer-delivery", token] }); } });
  const reportMutation = useMutation({ mutationFn: () => api.submitDeliveryReport(token, { reason, description: description.trim() }), onSuccess: () => { setShowReport(false); setMessage("Report submitted successfully. Our team will review your report."); queryClient.invalidateQueries({ queryKey: ["customer-delivery", token] }); } });
  if (order.status !== "DELIVERED") return <section className="feedback-note">Feedback will be available after your delivery is completed.</section>;
  return <section className="feedback-stack">
    {savedRating ? <div className="feedback-card"><h2>Your rating</h2><Stars value={savedRating.rating} /><p>Thank you for your feedback.</p></div> : <div className="feedback-card"><h2>How was your delivery?</h2><Stars value={rating} interactive onSelect={setRating} /><label className="feedback-label" htmlFor="rating-comment">How was your experience? <span>(optional)</span></label><textarea className="textarea" id="rating-comment" maxLength={500} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share a short comment" />{ratingMutation.isError && <p className="form-error">We could not submit your rating. Please try again.</p>}<button className="button button-primary" disabled={!rating || ratingMutation.isPending} onClick={() => ratingMutation.mutate()}>{ratingMutation.isPending ? "Submitting..." : "Submit rating"}</button></div>}
    {order.rider?.name && <div className="feedback-rider">Your rider<strong>{order.rider.name}</strong></div>}
    {!hasReport && <div className="feedback-card report-card"><div><h2>Report a problem</h2><p>If something went wrong, tell our team what happened.</p></div><button className="button button-secondary" onClick={() => setShowReport(true)}><MessageSquareWarning size={17} /> Report rider</button></div>}
    {showReport && <div className="feedback-modal-backdrop"><div className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="icon-button feedback-close" aria-label="Close report form" onClick={() => setShowReport(false)}><X size={18} /></button><h2 id="report-title">Report an issue with the rider</h2><div className="field"><label htmlFor="report-reason">Reason</label><select className="select" id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)}>{reasons.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label htmlFor="report-description">Description</label><textarea className="textarea" id="report-description" maxLength={1000} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={reason === "Other" ? "Please provide details so we can help" : "Tell us what happened"} /></div>{reportMutation.isError && <p className="form-error">We could not submit the report. Please try again.</p>}<div className="form-actions"><button className="button button-secondary" onClick={() => setShowReport(false)}>Cancel</button><button className="button button-primary" disabled={!description.trim() || reportMutation.isPending} onClick={() => { if (window.confirm("Are you sure you want to submit this report?")) reportMutation.mutate(); }}>{reportMutation.isPending ? "Submitting..." : "Submit report"}</button></div></div></div>}
    {message && <p className="feedback-success"><CheckCircle2 size={17} />{message}</p>}
  </section>;
}
function Stars({ value, interactive = false, onSelect }: { value: number; interactive?: boolean; onSelect?: (value: number) => void }) { return <div className="rating-stars" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={star <= value ? "star selected" : "star"} disabled={!interactive} aria-label={`${star} star${star === 1 ? "" : "s"}`} onClick={() => onSelect?.(star)}><Star size={26} fill={star <= value ? "currentColor" : "none"} /></button>)}</div>; }
