import React, { useEffect, useRef } from 'react'

export default function GoogleAd({ 
  client = "ca-pub-3355090635372737", 
  slot = "1649563554", 
  format = "auto",
  responsive = "true" 
}) {
  const adRef = useRef(null);
  const adPushed = useRef(false);

  useEffect(() => {
    if (!adPushed.current && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adPushed.current = true;
      } catch (e) {
        console.error("Google Ads error", e);
      }
    }
  }, []);

  return (
    <div 
      className="google-ad-container" 
      style={{ 
        minHeight: '600px', 
        width: '100%',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px dashed rgba(255, 255, 255, 0.1)', 
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* blog_ad */}
      <ins className="adsbygoogle"
           ref={adRef}
           style={{ display: 'block', width: '100%', height: '100%' }}
           data-ad-client={client}
           data-ad-slot={slot}
           data-ad-format={format}
           data-full-width-responsive={responsive}></ins>
    </div>
  )
}
