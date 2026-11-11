import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { REQUEST_TYPES, requestEmail } from './contact.js';

function PrivacyRequest() {
  const [kind, setKind] = useState(() => {
    const requested = new URLSearchParams(location.search).get('request');
    return Object.hasOwn(REQUEST_TYPES, requested) ? requested : 'access';
  });
  const [message, setMessage] = useState('');

  return <form id="privacy-request" onSubmit={event => event.preventDefault()}>
    <label htmlFor="request-kind">Request type</label>
    <select id="request-kind" name="kind" value={kind} onChange={event => setKind(event.target.value)}>
      {Object.entries(REQUEST_TYPES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
    </select>
    <label htmlFor="request-message">Message</label>
    <textarea id="request-message" name="message" value={message} onChange={event => setMessage(event.target.value)}
      placeholder="Describe your personal data request. Include only the details needed to handle it."/>
    <p className="privacy-request-note">This opens an email draft for you to review and send. Nothing is submitted automatically. Personal data is not erased until the operator handles the request, subject to applicable requirements.</p>
    <a className="button primary" id="request-email" href={requestEmail(kind, message)}>Open email draft</a>
  </form>;
}

createRoot(document.getElementById('privacy-request-app')).render(<PrivacyRequest/>);
