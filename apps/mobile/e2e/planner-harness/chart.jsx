import React from 'react';
export default function Chart({ onPin, selectOnTap }) {
  return <button type="button" onClick={() => { if (selectOnTap) onPin([16.2, 43.2]); }}>Test map point</button>;
}
