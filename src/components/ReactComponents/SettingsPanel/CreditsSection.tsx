import React from "react";
import { Row, SectionTitle } from "./components.tsx";
import { LYSSNA_LOGO, WEBSITE_URL } from "../../../brand.ts";

export default function CreditsSection() {
  return <section aria-label="Credits">
    <div className="sl-credits-heading"><img src={LYSSNA_LOGO} width="48" height="48" alt="" /><h2>Lyssna Lyrics</h2></div>
    <p className="sl-sp-experiments-note">Maintained by iPixelGalaxy. Shared settings remain compatible with Spicy Lyrics.</p>
    <SectionTitle>Credits</SectionTitle>
    <Row label="Spicy Lyrics" description="The official Spicy Lyrics plugin by Spikerko and its contributors provides the base of this plugin. Thank you for the lyric renderer and the work that made this fork possible.">
      <a className="sl-sp-btn" href="https://github.com/Spikerko/spicy-lyrics" target="_blank" rel="noopener noreferrer">Original project</a>
    </Row>
    <Row label="Lyssna · Arashii" description="Lyssna's creator provided the microphone icon, settings and toolbar designs, and permission to use them. Lyssna also supplies the public developer client key shared by both apps.">
      <a className="sl-sp-btn" href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Lyssna project</a>
    </Row>
  </section>;
}
