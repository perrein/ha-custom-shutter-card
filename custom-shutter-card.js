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

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

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
    
    // Debug log for initialization
    console.log("--- INITIALIZING SHUTTER APPLICATION ---");
    
    // Bind methods to ensure 'this' context is preserved
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._updateVisualElements = this._updateVisualElements.bind(this);
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

      .shutter-slats {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        background-color: var(--shutter-color);
        border-top: 1px solid #e0e0e0;
        z-index: 2;
        cursor: ns-resize;
        transition: none;
        background-image: repeating-linear-gradient(
          180deg,
          rgba(200, 200, 200, 0.1),
          rgba(200, 200, 200, 0.1) 8px,
          rgba(150, 150, 150, 0.2) 8px,
          rgba(150, 150, 150, 0.2) 10px
        );
      }

      .shutter-handle {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        width: 50px;
        height: 8px;
        background-color: var(--handle-color);
        border-radius: 4px;
        cursor: ns-resize;
        z-index: 10;
        transition: none; 
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
    const currentPosition = stateObj.attributes.current_position !== undefined 
      ? stateObj.attributes.current_position 
      : this.position;
    
    // For calculation, we need to transform the value: 100% = fully open = top at 0%, 0% = fully closed = top at 100%
    const shutterHeight = 100 - currentPosition;

    return html`
      <ha-card>
        <div class="card-container">
          <div class="card-header">
            ${this.config.title || stateObj.attributes.friendly_name || entityId}
            <span>${currentPosition}% ouvert</span>
          </div>
          
          <div class="main-content">
            <div class="shutter-container" 
                 @mousedown="${this._onMouseDown}" 
                 @touchstart="${this._onTouchStart}">
              <div class="window">
                <!-- Structure de fenêtre plus réaliste -->
                <div class="window-grid"></div>
                <div class="window-reflection"></div>
              </div>
              
              <!-- Volets -->
              <div class="shutter-slats" style="height: ${shutterHeight}%">
                <!-- Les lamelles sont créées par CSS -->
              </div>
              
              <!-- Cadre de la fenêtre -->
              <div class="shutter-frame"></div>
              
              <!-- Poignée du volet -->
              <div class="shutter-handle" id="shutter-handle"
                   style="bottom: ${shutterHeight}%"></div>
            </div>
            
            <div class="info-panel">
              <div class="info-row">
                <span class="info-label">État:</span>
                <span class="info-value">${this._getStateLabel(stateObj)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Position:</span>
                <span class="info-value">${currentPosition}%</span>
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
              <button class="control-button" @click="${() => this._setPosition(Math.min(100, currentPosition + 10))}">+10%</button>
              <button class="control-button" @click="${() => this._setPosition(Math.max(0, currentPosition - 10))}">-10%</button>
            </div>
            <input type="range" min="0" max="100" value="${currentPosition}" 
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
      this._updatePositionFromMouseEvent(e);
      
      // Add event listeners to window to handle mouse movements outside the card
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
      
      console.log("Mouse down detected - Drag started");
      
      // Prevent text selection during drag
      e.preventDefault();
    } catch (error) {
      console.error("Error in _onMouseDown:", error);
    }
  }

  _onTouchStart(e) {
    try {
      this._isMouseDown = true;
      this._updatePositionFromTouchEvent(e);
      
      // Add event listeners to window to handle touch movements
      window.addEventListener('touchmove', this._onTouchMove);
      window.addEventListener('touchend', this._onTouchEnd);
      
      console.log("Touch start detected - Drag started");
      
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
      
      // Calculate position percentage from mouse Y position in relation to container
      let newPositionPercent = ((containerRect.bottom - e.clientY) / containerRect.height) * 100;
      
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
    try {
      const shutterHeight = 100 - this.position;
      
      // Get elements
      const shutterElement = this.shadowRoot.querySelector('.shutter-slats');
      const handleElement = this.shadowRoot.querySelector('.shutter-handle');
      
      // Log elements for debugging
      console.log("Updating visual elements: shutter =", shutterElement ? "found" : "not found", 
                  "handle =", handleElement ? "found" : "not found", 
                  "height =", shutterHeight);
      
      // Update elements if they exist
      if (shutterElement) {
        shutterElement.style.height = `${shutterHeight}%`;
      }
      
      if (handleElement) {
        handleElement.style.bottom = `${shutterHeight}%`;
      }
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
        
        // Calculate position percentage from touch Y position in relation to container
        let newPositionPercent = ((containerRect.bottom - e.touches[0].clientY) / containerRect.height) * 100;
        
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
      
      // Set new position
      this.position = position;
      
      // Log button actions
      if (position === 100) {
        console.log("OPEN button clicked");
      } else if (position === 0) {
        console.log("CLOSE button clicked");
      } else if (position > oldPosition) {
        console.log("OPEN button (+10%) clicked");
      } else if (position < oldPosition) {
        console.log("CLOSE button (-10%) clicked");
      }
      
      console.log("setPosition called with pos =", position);
      
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
      
      if (this.position === 0) {
        service = 'close_cover';
      } else if (this.position === 100) {
        service = 'open_cover';
      } else {
        service = 'set_cover_position';
        serviceData.position = this.position;
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
