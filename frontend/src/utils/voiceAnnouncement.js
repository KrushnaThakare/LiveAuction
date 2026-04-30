let utterance = null;

export function speak(text, options = {}) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate || 0.9;
  utterance.pitch = options.pitch || 1.1;
  utterance.volume = options.volume || 1;
  utterance.lang = options.lang || 'en-IN';

  window.speechSynthesis.speak(utterance);
}

export function announceAuctionStart(playerName, basePrice) {
  speak(`Auction started for ${playerName}. Base price is ${formatPriceForSpeech(basePrice)}.`);
}

export function announceBid(teamName, bidAmount) {
  speak(`${teamName} bids ${formatPriceForSpeech(bidAmount)}!`);
}

export function announcePlayerSold(playerName, teamName, amount) {
  speak(
    `${playerName} sold to ${teamName} for ${formatPriceForSpeech(amount)}! Congratulations!`,
    { rate: 0.8, pitch: 1.2 }
  );
}

export function announcePlayerUnsold(playerName) {
  speak(`${playerName} is unsold.`, { rate: 0.9, pitch: 0.9 });
}

function formatPriceForSpeech(amount) {
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)} lakh rupees`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)} thousand rupees`;
  return `${amount} rupees`;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
