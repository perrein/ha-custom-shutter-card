/**
 * Custom Shutter Card for Home Assistant
 * 
 * This custom card provides an interactive visualization for window shutters/blinds
 * with drag-and-drop positioning capabilities.
 * 
 * @author Custom Shutter Card Contributors
 * @version 1.0.0
 * @license MIT
 * @see https://github.com/yourusername/custom-shutter-card
 */

// Chargement des dépendances
let LitElement, html, css;

try {
  // Essayer de trouver les éléments Home Assistant
  LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  html = LitElement.prototype.html;
  css = LitElement.prototype.css;
} catch (e) {
  // Fallback quand on n'est pas dans Home Assistant
  console.log("Not in Home Assistant environment, using direct LitElement import");
  
  // Définir des objets fictifs pour permettre le fonctionnement hors HA
  class MockLitElement {
    static get properties() { return {}; }
    updated() {}
    render() { return document.createElement('div'); }
  }
  
  LitElement = MockLitElement;
  html = (strings, ...values) => strings.reduce((result, string, i) => result + string + (values[i] || ''), '');
  css = (strings, ...values) => strings.reduce((result, string, i) => result + string + (values[i] || ''), '');
}

class CustomShutterCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      position: { type: Number },
      dragging: { type: Boolean },
      _isMouseDown: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.position = 100; // 100% = fully open, 0% = fully closed
    this.dragging = false;
    this._isMouseDown = false;
    
    // Variables pour le calcul du mouvement relatif
    this._initialPosition = 100;
    this._startY = 0;
    
    // Debug log for initialization
    console.log("--- INITIALIZING SHUTTER APPLICATION ---");
    
    // Bind methods to ensure 'this' context is preserved
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._updateVisualElements = this._updateVisualElements.bind(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    // For debugging in the browser console when component is actually in DOM
    setTimeout(() => {
      console.log("Component connected to DOM");
      if (this.shadowRoot) {
        console.log("Window:", this.shadowRoot.querySelector('.window'));
        console.log("Shutter:", this.shadowRoot.querySelector('.shutter-slats'));
        console.log("Handle:", this.shadowRoot.querySelector('.shutter-handle'));
        console.log("Current position:", this.position);
        
        if (this.hass && this.config) {
          const entityId = this.config.entity;
          if (this.hass.states[entityId]) {
            const stateObj = this.hass.states[entityId];
            console.log("Entity state:", stateObj.state);
            console.log("Entity attributes:", stateObj.attributes);
          }
        }
      } else {
        console.error("ShadowRoot not found!");
      }
    }, 500);
  }

  static get styles() {
    return css`
      :host {
        display: block;
        --shutter-width: 180px;
        --shutter-height: 300px;
        --header-height: 40px;
        --footer-height: 40px;
        --info-panel-width: 150px;
        --shutter-color: #f0f0f0;
        --handle-color: #03a9f4;
        --window-color: #78A5C5;
        --frame-color: #546E7A;
        --primary-color: #03a9f4;
        --primary-color-light: #4fc3f7;
        --primary-color-dark: #0288d1;
      }

      .card-container {
        background-color: var(--ha-card-background, var(--card-background-color, white));
        border-radius: var(--ha-card-border-radius, 4px);
        box-shadow: var(--ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12));
        color: var(--primary-text-color);
        padding: 16px;
        transition: all 0.3s ease-out;
        overflow: hidden;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: var(--header-height);
        margin-bottom: 16px;
        font-weight: 500;
        font-size: 1.2em;
      }

      .card-header span {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
        color: white;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: 500;
      }

      .main-content {
        display: flex;
        justify-content: space-between;
        width: 100%;
        gap: 20px;
      }

      .shutter-container {
        position: relative;
        width: var(--shutter-width);
        height: var(--shutter-height);
        background-color: transparent;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .window {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to bottom right, #D4EEFF 0%, #A5D6F7 100%);
        z-index: 1;
        border: none;
        box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.3);
        pointer-events: none; /* Permet aux clics de passer à travers */
      }

      .window-grid {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
          linear-gradient(0deg, rgba(255,255,255,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px);
        background-size: 20px 20px;
        opacity: 0.4;
        pointer-events: none;
      }

      .window-reflection {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: 
          linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 51%, rgba(255,255,255,0) 100%);
        pointer-events: none;
      }

      .shutter-frame {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 4px solid var(--frame-color);
        box-sizing: border-box;
        border-radius: 2px;
        pointer-events: none;
        z-index: 3;
        background: transparent;
      }

      .shutter-frame::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, 
          rgba(255,255,255,0.12) 0%, 
          rgba(255,255,255,0.05) 40%, 
          rgba(0,0,0,0) 50%, 
          rgba(0,0,0,0.05) 60%, 
          rgba(0,0,0,0.1) 100%);
        pointer-events: none;
      }

      /* Container pour les volets et la poignée - exactement comme dans index.html */
      .shutter-slats-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden; /* Pour masquer le contenu plutôt que de l'écraser */
        z-index: 5; /* Z-index élevé pour être au-dessus de la fenêtre */
        cursor: ns-resize;
        background: none !important; /* Assure qu'aucun fond ne cache les volets */
      }
      
      .shutter-slats {
        position: absolute;
        top: -25px; /* Commence plus haut pour assurer une couverture complète */
        left: 0;
        width: 100%;
        height: 200%; /* Hauteur plus importante pour garantir la couverture */
        background-color: var(--shutter-color);
        transform-origin: top;
        transform: translateY(-50%); /* Position initiale à moitié fermée */
        z-index: 10;
        cursor: ns-resize;
        transition: none;
        background-image: repeating-linear-gradient(
          0deg, 
          #F0F0F0 0px, 
          #FFFFFF 2px, 
          #F8F8F8 4px, 
          #F2F2F2 15px
        );
        box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
        overflow: hidden; /* Pour s'assurer que rien ne dépasse */
      }

      .shutter-handle {
        position: absolute;
        left: 50%;
        /* La poignée est attachée au bas du volet et se déplace avec lui */
        bottom: -5px; /* Légèrement sous le bas du volet */
        transform: translateX(-50%);
        width: 60px;
        height: 8px;
        background-color: #455A64;
        border-radius: 4px;
        cursor: ns-resize;
        z-index: 11; /* Au-dessus du volet */
        transition: none; /* Désactivation de la transition pour un suivi instantané */
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      /* Indicateur de position qui apparaît lors du déplacement */
      .position-indicator {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 4px;
        padding: 3px 7px;
        font-size: 14px;
        font-weight: bold;
        white-space: nowrap;
        z-index: 20;
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .shutter-handle:hover, .shutter-handle:active {
        background-color: var(--primary-color-dark);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        transform: translateX(-50%) scale(1.05);
      }

      .info-panel {
        flex: 1;
        padding: 15px;
        background-color: rgba(0, 0, 0, 0.02);
        border-radius: 10px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      .info-row:last-child {
        border-bottom: none;
      }

      .info-label {
        color: var(--secondary-text-color);
        font-size: 0.95rem;
      }

      .info-value {
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .card-footer {
        display: flex;
        flex-direction: column;
        margin-top: 20px;
      }

      .position-control {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 15px;
        justify-content: center;
      }

      .control-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 0.9em;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.14);
        gap: 8px;
      }

      .control-button:hover {
        background-color: var(--primary-color-light);
        transform: translateY(-1px);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
      }

      .control-button:active {
        transform: translateY(1px);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .position-slider {
        width: 100%;
        margin: 12px 0;
        -webkit-appearance: none;
        height: 8px;
        background: #e1e1e1;
        outline: none;
        opacity: 0.9;
        border-radius: 5px;
        transition: all 0.2s;
      }
      
      .position-slider:hover {
        opacity: 1;
      }
      
      .position-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        background: var(--primary-color);
        cursor: pointer;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        border: 2px solid white;
      }
      
      .position-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        background: var(--primary-color);
        cursor: pointer;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      
      .position-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
      }
      
      .position-slider::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
      }
      
      .attribution {
        text-align: right;
        font-size: 0.8em;
        color: var(--secondary-text-color);
        opacity: 0.7;
        margin-top: 10px;
      }

      @media (max-width: 500px) {
        .main-content {
          flex-direction: column;
          align-items: center;
        }
        
        .info-panel {
          width: var(--shutter-width);
          margin-top: 16px;
        }
      }
    `;
  }

  setConfig(config) {
    if (!config.entity || config.entity.split('.')[0] !== 'cover') {
      throw new Error('Please specify a cover entity');
    }
    this.config = config;
  }

  getCardSize() {
    return 3;
  }

  firstUpdated() {
    // After first render, update the visual elements
    console.log("First render completed, updating elements");
    setTimeout(() => {
      // Setting initial position
      if (this.hass && this.config && this.hass.states[this.config.entity]) {
        const stateObj = this.hass.states[this.config.entity];
        if (stateObj.attributes.current_position !== undefined) {
          this.position = stateObj.attributes.current_position;
        }
      }
      this._updateVisualElements();
    }, 100);
  }

  updated(changedProps) {
    if (changedProps.has('position')) {
      console.log("Position property changed, updating visual elements");
      this._updateVisualElements();
    }
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];
    
    if (!stateObj) {
      return html`
        <ha-card>
          <div class="card-container">
            <div class="card-header">Entity not found: ${entityId}</div>
          </div>
        </ha-card>
      `;
    }

    // Get the current position from the entity or the internal state
    // La position dans Home Assistant: 0% = fermé, 100% = ouvert
    const haPosition = stateObj.attributes.current_position !== undefined 
      ? stateObj.attributes.current_position 
      : this.position;
    
    // Pour notre affichage visuel:
    // Lorsque le volet est ouvert (100%), il doit être en haut (transformY(-100%))
    // Lorsque le volet est fermé (0%), il doit être en bas (transformY(0%))
    const transformValue = -haPosition;

    return html`
      <ha-card>
        <div class="card-container">
          <div class="card-header">
            ${this.config.title || stateObj.attributes.friendly_name || entityId}
            <span>${haPosition}% ouvert</span>
          </div>
          
          <div class="main-content">
            <div class="shutter-container" 
                 @mousedown="${this._onMouseDown}" 
                 @touchstart="${this._onTouchStart}">
              <!-- Fenêtre (fond) -->
              <div class="window">
                <div class="window-grid"></div>
                <div class="window-reflection"></div>
              </div>
              
              <!-- Conteneur pour les volets -->
              <div class="shutter-slats-container">
                <!-- Volets avec transformation -->
                <div class="shutter-slats" 
                     style="transform: translateY(${transformValue}%)">
                  <!-- Poignée au bas du volet - à l'intérieur du volet pour qu'elle se déplace avec lui -->
                  <div class="shutter-handle" 
                       style="transform: translateX(-50%)">
                  </div>
                </div>
              </div>
              
              <!-- Indicateur de position qui apparaît pendant le glissement -->
              ${this._isMouseDown ? html`
              <div class="position-indicator" 
                  style="left: 50%; bottom: ${this.position}%; transform: translateX(-50%) translateY(50%);">
                  ${this.position}%
              </div>` : ''}
              
              <!-- Cadre de la fenêtre (par-dessus) -->
              <div class="shutter-frame"></div>
            </div>
            
            <div class="info-panel">
              <div class="info-row">
                <span class="info-label">État:</span>
                <span class="info-value">${this._getStateLabel(stateObj)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Position:</span>
                <span class="info-value">${haPosition}%</span>
              </div>
              ${stateObj.attributes.current_tilt_position !== undefined ? html`
                <div class="info-row">
                  <span class="info-label">Inclinaison:</span>
                  <span class="info-value">${stateObj.attributes.current_tilt_position}%</span>
                </div>
              ` : ''}
              ${stateObj.attributes.device_class ? html`
                <div class="info-row">
                  <span class="info-label">Type:</span>
                  <span class="info-value">${this._capitalizeFirstLetter(stateObj.attributes.device_class)}</span>
                </div>
              ` : ''}
              ${stateObj.attributes.last_changed ? html`
                <div class="info-row">
                  <span class="info-label">Dernier changement:</span>
                  <span class="info-value">${this._formatTimestamp(stateObj.last_changed)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="card-footer">
            <div class="position-control">
              <button class="control-button" @click="${() => this._setPosition(100)}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
                Ouvrir
              </button>
              <button class="control-button" @click="${() => this._setPosition(0)}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                Fermer
              </button>
              <button class="control-button" @click="${() => this._setPosition(Math.min(100, haPosition + 10))}">+10%</button>
              <button class="control-button" @click="${() => this._setPosition(Math.max(0, haPosition - 10))}">-10%</button>
            </div>
            <input type="range" min="0" max="100" value="${haPosition}" 
                  class="position-slider" @change="${this._handleSliderChange}">
          </div>
          
          <div class="attribution">Custom Shutter Card v1.0.0</div>
        </div>
      </ha-card>
    `;
  }

  _capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  _getStateLabel(stateObj) {
    switch (stateObj.state) {
      case 'open':
        return 'Ouvert';
      case 'closed':
        return 'Fermé';
      case 'opening':
        return 'En ouverture';
      case 'closing':
        return 'En fermeture';
      default:
        return stateObj.state;
    }
  }

  _onMouseDown(e) {
    try {
      this._isMouseDown = true;
      
      // Mémoriser la position initiale et le point de départ de la souris
      this._initialPosition = this.position;
      const container = this.shadowRoot.querySelector('.shutter-container');
      const containerRect = container.getBoundingClientRect();
      this._startY = e.clientY;
      
      // Add event listeners to window to handle mouse movements outside the card
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
      
      console.log("Mouse down detected - Drag started, initial position:", this._initialPosition);
      
      // Prevent text selection during drag
      e.preventDefault();
    } catch (error) {
      console.error("Error in _onMouseDown:", error);
    }
  }

  _onTouchStart(e) {
    try {
      this._isMouseDown = true;
      
      // Mémoriser la position initiale et le point de départ du toucher
      this._initialPosition = this.position;
      const container = this.shadowRoot.querySelector('.shutter-container');
      const containerRect = container.getBoundingClientRect();
      this._startY = e.touches[0].clientY;
      
      // Add event listeners to window to handle touch movements
      window.addEventListener('touchmove', this._onTouchMove);
      window.addEventListener('touchend', this._onTouchEnd);
      
      console.log("Touch start detected - Drag started, initial position:", this._initialPosition);
      
      // Prevent scrolling during interaction
      e.preventDefault();
    } catch (error) {
      console.error("Error in _onTouchStart:", error);
    }
  }

  _onMouseMove(e) {
    if (this._isMouseDown) {
      this._updatePositionFromMouseEvent(e);
    }
  }

  _onTouchMove(e) {
    if (this._isMouseDown) {
      this._updatePositionFromTouchEvent(e);
    }
  }

  _onMouseUp() {
    try {
      this._isMouseDown = false;
      
      // Remove event listeners when done
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('mouseup', this._onMouseUp);
      
      // Log pour débugger la fin du déplacement
      console.log("End of drag (mouseup)");
      
      // Set the final position in Home Assistant
      this._sendPositionCommand();
    } catch (error) {
      console.error("Error in _onMouseUp:", error);
    }
  }

  _onTouchEnd() {
    try {
      this._isMouseDown = false;
      
      // Remove event listeners when done
      window.removeEventListener('touchmove', this._onTouchMove);
      window.removeEventListener('touchend', this._onTouchEnd);
      
      console.log("End of touch drag");
      
      // Set the final position in Home Assistant
      this._sendPositionCommand();
    } catch (error) {
      console.error("Error in _onTouchEnd:", error);
    }
  }

  _updatePositionFromMouseEvent(e) {
    try {
      const container = this.shadowRoot.querySelector('.shutter-container');
      if (!container) {
        console.error("Container element not found");
        return;
      }
      
      const containerRect = container.getBoundingClientRect();
      
      // Calcul direct de la position en fonction de l'emplacement de la souris dans le conteneur
      // Le haut du conteneur = 100% (ouvert), le bas = 0% (fermé)
      const relativeMouseY = e.clientY - containerRect.top;
      const containerHeight = containerRect.height;
      let newPositionPercent = 100 - (relativeMouseY / containerHeight * 100);
      
      // Clamp the position between 0 and 100
      newPositionPercent = Math.max(0, Math.min(100, newPositionPercent));
      
      // Round to nearest integer for cleaner UI
      this.position = Math.round(newPositionPercent);
      
      console.log("Position calculée par la souris:", this.position);
      
      // Mettre à jour manuellement la position du handle et des volets
      this._updateVisualElements();
      
      // Force re-render after position update
      this.requestUpdate();
    } catch (error) {
      console.error("Error in _updatePositionFromMouseEvent:", error);
    }
  }
  
  _updateVisualElements() {
    if (!this.shadowRoot) {
      console.error("No shadowRoot found - cannot update visual elements");
      return;
    }
    
    try {
      // Affichage visuel: 
      // Pour HA: 0% = fermé (volet en bas), 100% = ouvert (volet en haut)
      
      // Calcul de la valeur de transformation pour déplacer le volet
      // Lorsque position = 0% (fermé), translateY(0%)
      // Lorsque position = 100% (ouvert), translateY(-100%)
      const transformValue = -this.position;
      
      // Log pour débogage
      console.log("Position:", this.position, "Transform Value:", transformValue);
      
      // Récupérer les éléments du DOM
      const shutterElement = this.shadowRoot.querySelector('.shutter-slats');
      
      // Mettre à jour la position du volet
      if (shutterElement) {
        // Utiliser transform pour déplacer le volet (plus performant que height)
        shutterElement.style.transform = `translateY(${transformValue}%)`;
        console.log("Shutter transform set to:", transformValue + "%");
      } else {
        console.error("Shutter element not found in DOM");
      }
      
      // La poignée est attachée au volet et se déplace avec lui
      // Donc ici on ne fait rien de spécial, elle se déplace automatiquement 
      // avec le volet puisqu'elle est à l'intérieur de l'élément .shutter-slats
      
      // Demander une mise à jour de l'interface
      this.requestUpdate();
    } catch (error) {
      console.error("Error in _updateVisualElements:", error);
    }
  }

  _updatePositionFromTouchEvent(e) {
    try {
      if (e.touches.length > 0) {
        const container = this.shadowRoot.querySelector('.shutter-container');
        if (!container) {
          console.error("Container element not found for touch event");
          return;
        }
        
        const containerRect = container.getBoundingClientRect();
        
        // Calcul direct de la position en fonction de l'emplacement du toucher dans le conteneur
        // Le haut du conteneur = 100% (ouvert), le bas = 0% (fermé)
        const relativeTouchY = e.touches[0].clientY - containerRect.top;
        const containerHeight = containerRect.height;
        let newPositionPercent = 100 - (relativeTouchY / containerHeight * 100);
        
        // Clamp the position between 0 and 100
        newPositionPercent = Math.max(0, Math.min(100, newPositionPercent));
        
        // Round to nearest integer for cleaner UI
        this.position = Math.round(newPositionPercent);
        
        console.log("Position calculée (touch):", this.position);
        
        // Use the centralized function for visual updates
        this._updateVisualElements();
        
        // Force re-render after position update
        this.requestUpdate();
      }
    } catch (error) {
      console.error("Error in _updatePositionFromTouchEvent:", error);
    }
  }

  _handleSliderChange(e) {
    try {
      this.position = parseInt(e.target.value);
      console.log("Slider change position:", this.position);
      
      // Use the centralized function for visual updates
      this._updateVisualElements();
      
      this._sendPositionCommand();
    } catch (error) {
      console.error("Error in _handleSliderChange:", error);
    }
  }

  _setPosition(position) {
    try {
      // Store initial position for logging
      const oldPosition = this.position;
      
      // Set new position - round to the nearest 10% if coming from +10%/-10% buttons
      let newPosition = position;
      if (position !== 0 && position !== 100) {
        // Round to nearest 10%
        newPosition = Math.round(position / 10) * 10;
      }
      
      this.position = newPosition;
      
      // Log button actions
      if (position === 100) {
        console.log("OPEN button clicked");
      } else if (position === 0) {
        console.log("CLOSE button clicked");
      } else if (position > oldPosition) {
        console.log("OPEN button (+10%) clicked - Position:", newPosition);
      } else if (position < oldPosition) {
        console.log("CLOSE button (-10%) clicked - Position:", newPosition);
      }
      
      console.log("setPosition called with pos =", newPosition);
      
      // Use the centralized function for visual updates
      this._updateVisualElements();
      
      // Send command to Home Assistant
      this._sendPositionCommand();
    } catch (error) {
      console.error("Error in _setPosition:", error);
    }
  }

  _sendPositionCommand() {
    try {
      const entityId = this.config.entity;
      
      // Get the correct service based on position
      let domain = 'cover';
      let service;
      let serviceData = { entity_id: entityId };
      
      // La position dans notre interface correspond directement à 
      // la position dans Home Assistant
      // 0% = fermé, 100% = ouvert
      if (this.position === 100) {
        // Position 100% = ouverture complète
        service = 'open_cover';
        console.log("Commande: ouverture complète (100%)");
      } else if (this.position === 0) {
        // Position 0% = fermeture complète
        service = 'close_cover';
        console.log("Commande: fermeture complète (0%)");
      } else {
        // Pour les positions intermédiaires, on utilise directement la valeur
        service = 'set_cover_position';
        serviceData.position = this.position;
        console.log(`Position pour HA: ${serviceData.position}%`);
      }
      
      // Log the service call for debugging
      console.log(`Service appelé: ${domain}.${service} avec la position ${this.position}%`);
      
      // Call the service to control the cover
      if (this.hass && this.hass.callService) {
        this.hass.callService(domain, service, serviceData);
      } else {
        console.error("Home Assistant API not available for service call");
      }
    } catch (error) {
      console.error("Error in _sendPositionCommand:", error);
    }
  }
}

// Register the card for the Lovelace dashboard
if (!customElements.get('custom-shutter-card')) {
  customElements.define('custom-shutter-card', CustomShutterCard);
}

// Add it to the official card types in HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'custom-shutter-card',
  name: 'Custom Shutter Card',
  description: 'A visual shutter control card with drag and drop positioning',
  preview: true,
});
