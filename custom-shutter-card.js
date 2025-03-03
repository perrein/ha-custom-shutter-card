/**
 * Custom Shutter Card for Home Assistant
 * 
 * This custom card provides an interactive visualization for window shutters/blinds
 * with drag-and-drop positioning capabilities.
 * 
 * @version 1.0.0
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
        font-weight: bold;
        font-size: 1.2em;
      }

      .main-content {
        display: flex;
        justify-content: space-between;
        width: 100%;
      }

      .shutter-container {
        position: relative;
        width: var(--shutter-width);
        height: var(--shutter-height);
        background-color: var(--secondary-background-color);
        border-radius: 4px;
        overflow: hidden;
      }

      .window {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #a0c8e0;
        background-image: linear-gradient(135deg, #a0c8e0 0%, #86bbda 100%);
        z-index: 1;
      }

      .shutter-frame {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 6px solid #8B4513;
        box-sizing: border-box;
        border-radius: 4px;
        pointer-events: none;
        z-index: 3;
      }

      .shutter-slats {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        background-color: #d4d4d4;
        border-top: 1px solid #aaa;
        z-index: 2;
        cursor: ns-resize;
        transition: height 0.2s ease-out;
      }

      .shutter-handle {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 8px;
        background-color: #888;
        border-radius: 4px;
        cursor: ns-resize;
        z-index: 4;
      }

      .info-panel {
        width: var(--info-panel-width);
        padding: 8px;
        background-color: var(--secondary-background-color);
        border-radius: 4px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
      }

      .info-label {
        color: var(--secondary-text-color);
      }

      .info-value {
        font-weight: bold;
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        height: var(--footer-height);
      }

      .position-control {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .position-display {
        margin: 0 10px;
        font-weight: bold;
      }

      .control-button {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        margin-right: 4px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background-color 0.3s ease;
      }

      .control-button:hover {
        background-color: var(--primary-color-light);
      }

      .slat-line {
        position: absolute;
        width: 100%;
        height: 1px;
        background-color: #aaa;
        pointer-events: none;
      }

      .position-slider {
        width: 100%;
        margin: 8px 0;
      }
      
      .attribution {
        text-align: right;
        font-size: 0.8em;
        color: var(--secondary-text-color);
        opacity: 0.7;
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
    
    // Generate slat lines for visual effect
    const slatLines = [];
    const slatCount = 20;
    const slatSpacing = 100 / slatCount;
    
    for (let i = 0; i < slatCount; i++) {
      const topPosition = (i * slatSpacing) + '%';
      slatLines.push(html`<div class="slat-line" style="top: ${topPosition}"></div>`);
    }

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
              <div class="window"></div>
              <div class="shutter-slats" style="height: ${shutterHeight}%">
                ${slatLines}
              </div>
              <div class="shutter-frame"></div>
              <div class="shutter-handle" style="bottom: ${shutterHeight}%"></div>
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
              <button class="control-button" @click="${() => this._setPosition(100)}">Ouvrir</button>
              <button class="control-button" @click="${() => this._setPosition(0)}">Fermer</button>
              <button class="control-button" @click="${() => this._setPosition(Math.min(100, this.position + 10))}">+10%</button>
              <button class="control-button" @click="${() => this._setPosition(Math.max(0, this.position - 10))}">-10%</button>
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
    this._isMouseDown = true;
    this._updatePositionFromMouseEvent(e);
    
    // Add event listeners to window to handle mouse movements outside the card
    window.addEventListener('mousemove', this._boundMouseMove = this._onMouseMove.bind(this));
    window.addEventListener('mouseup', this._boundMouseUp = this._onMouseUp.bind(this));
    
    // Prevent text selection during drag
    e.preventDefault();
  }

  _onTouchStart(e) {
    this._isMouseDown = true;
    this._updatePositionFromTouchEvent(e);
    
    // Add event listeners to window to handle touch movements
    window.addEventListener('touchmove', this._boundTouchMove = this._onTouchMove.bind(this));
    window.addEventListener('touchend', this._boundTouchEnd = this._onTouchEnd.bind(this));
    
    // Prevent scrolling during interaction
    e.preventDefault();
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
    this._isMouseDown = false;
    
    // Remove event listeners when done
    window.removeEventListener('mousemove', this._boundMouseMove);
    window.removeEventListener('mouseup', this._boundMouseUp);
    
    // Set the final position in Home Assistant
    this._sendPositionCommand();
  }

  _onTouchEnd() {
    this._isMouseDown = false;
    
    // Remove event listeners when done
    window.removeEventListener('touchmove', this._boundTouchMove);
    window.removeEventListener('touchend', this._boundTouchEnd);
    
    // Set the final position in Home Assistant
    this._sendPositionCommand();
  }

  _updatePositionFromMouseEvent(e) {
    const container = this.shadowRoot.querySelector('.shutter-container');
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position percentage from mouse Y position in relation to container
    let newPositionPercent = ((containerRect.bottom - e.clientY) / containerRect.height) * 100;
    
    // Clamp the position between 0 and 100
    newPositionPercent = Math.max(0, Math.min(100, newPositionPercent));
    
    // Round to nearest integer for cleaner UI
    this.position = Math.round(newPositionPercent);
    
    // Force re-render after position update
    this.requestUpdate();
  }

  _updatePositionFromTouchEvent(e) {
    if (e.touches.length > 0) {
      const container = this.shadowRoot.querySelector('.shutter-container');
      const containerRect = container.getBoundingClientRect();
      
      // Calculate position percentage from touch Y position in relation to container
      let newPositionPercent = ((containerRect.bottom - e.touches[0].clientY) / containerRect.height) * 100;
      
      // Clamp the position between 0 and 100
      newPositionPercent = Math.max(0, Math.min(100, newPositionPercent));
      
      // Round to nearest integer for cleaner UI
      this.position = Math.round(newPositionPercent);
      
      // Force re-render after position update
      this.requestUpdate();
    }
  }

  _handleSliderChange(e) {
    this.position = parseInt(e.target.value);
    this._sendPositionCommand();
  }

  _setPosition(position) {
    this.position = position;
    this._sendPositionCommand();
  }

  _sendPositionCommand() {
    const entityId = this.config.entity;
    
    // Get the correct service based on position
    let service;
    let serviceData = { entity_id: entityId };
    
    if (this.position === 0) {
      service = 'cover.close_cover';
    } else if (this.position === 100) {
      service = 'cover.open_cover';
    } else {
      service = 'cover.set_cover_position';
      serviceData.position = this.position;
    }
    
    // Call the service to control the cover
    this.hass.callService('cover', service, serviceData);
  }
}

// Define the custom element
customElements.define('custom-shutter-card', CustomShutterCard);

// Add it to the official card types in HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'custom-shutter-card',
  name: 'Custom Shutter Card',
  description: 'A visual shutter control card with drag and drop positioning',
  preview: true,
});
