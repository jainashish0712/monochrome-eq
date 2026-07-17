export class ReverbEffect {
    constructor(audioContext) {
        this.context = audioContext;
        
        this.options = {
            mix: 0.5,
            time: 0.01,
            decay: 0.01,
            reverse: false
        };
        
        this.inputNode = this.context.createGain();
        this.reverbNode = this.context.createConvolver();
        this.outputNode = this.context.createGain();
        this.wetGainNode = this.context.createGain();
        this.dryGainNode = this.context.createGain();
        
        this.inputNode.connect(this.reverbNode);
        this.reverbNode.connect(this.wetGainNode);
        this.inputNode.connect(this.dryGainNode);
        this.dryGainNode.connect(this.outputNode);
        this.wetGainNode.connect(this.outputNode);
        
        this.updateGains();
        this.buildImpulse();
    }
    
    getNodes() {
        return {
            input: this.inputNode,
            output: this.outputNode
        };
    }
    
    reconnect() {
        // Required for graph rebuilds
        this.inputNode.disconnect();
        this.reverbNode.disconnect();
        this.dryGainNode.disconnect();
        this.wetGainNode.disconnect();
        
        this.inputNode.connect(this.reverbNode);
        this.reverbNode.connect(this.wetGainNode);
        this.inputNode.connect(this.dryGainNode);
        this.dryGainNode.connect(this.outputNode);
        this.wetGainNode.connect(this.outputNode);
    }
    
    updateGains() {
        // Equal power crossfade
        this.dryGainNode.gain.value = Math.cos(this.options.mix * 0.5 * Math.PI);
        this.wetGainNode.gain.value = Math.cos((1.0 - this.options.mix) * 0.5 * Math.PI);
    }
    
    setMix(mix) {
        if (mix >= 0 && mix <= 1) {
            this.options.mix = mix;
            this.updateGains();
        }
    }
    
    setTime(time) {
        if (time >= 0.0001 && time <= 10) {
            this.options.time = time;
            this.buildImpulse();
        }
    }
    
    setDecay(decay) {
        if (decay >= 0.0001 && decay <= 10) {
            this.options.decay = decay;
            this.buildImpulse();
        }
    }
    
    setReverse(reverse) {
        this.options.reverse = !!reverse;
        this.buildImpulse();
    }
    
    buildImpulse() {
        const length = this.context.sampleRate * this.options.time;
        const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const n = this.options.reverse ? length - i : i;
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, this.options.decay);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, this.options.decay);
        }
        
        if (this.reverbNode.buffer) {
            this.inputNode.disconnect(this.reverbNode);
            this.reverbNode.disconnect(this.wetGainNode);
            
            this.reverbNode = this.context.createConvolver();
            this.inputNode.connect(this.reverbNode);
            this.reverbNode.connect(this.wetGainNode);
        }
        
        this.reverbNode.buffer = impulse;
    }
    
    disconnect() {
        this.inputNode.disconnect();
        this.reverbNode.disconnect();
        this.wetGainNode.disconnect();
        this.dryGainNode.disconnect();
        this.outputNode.disconnect();
    }
}
