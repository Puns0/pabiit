import React, { useEffect } from 'react'

export default function GoogleAd({ 
  client = "ca-pub-3355090635372737", 
  slot = "1649563554", 
  format = "auto",
  responsive = "true" 
}) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("Google Ads error", e);
    }
  }, []);

  return (
    <div className="google-ad-container">
      {/* blog_ad */}
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client={client}
           data-ad-slot={slot}
           data-ad-format={format}
           data-full-width-responsive={responsive}></ins>
    </div>
  )
}
