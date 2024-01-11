let proxyApiUrl = 'YOUR_PROXY_API_URL'

mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

let defaultStyle = 'Satellite Streets'

let mapStyles = {
    'Streets': 'mapbox://styles/mapbox/streets-v12',
    'Outdoors': 'mapbox://styles/mapbox/outdoors-v12',
    'Light': 'mapbox://styles/mapbox/light-v11',
    'Dark': 'mapbox://styles/mapbox/dark-v11',
    'Satellite': 'mapbox://styles/mapbox/satellite-v9',
    'Satellite Streets': 'mapbox://styles/mapbox/satellite-streets-v12',
    'Navigation Day': 'mapbox://styles/mapbox/navigation-day-v1',
    'Navigation Night': 'mapbox://styles/mapbox/navigation-night-v1'
}

const map = new mapboxgl.Map({
    container: 'map',
    style: mapStyles[defaultStyle],
    center: [-74.5, 40],
    zoom: 9,
    preserveDrawingBuffer: true
});

let spinnerConfig = {
    lines: 13,
    length: 20,
    width: 10,
    radius: 30,
    scale: 1,
    corners: 1,
    color: '#ddd',
    opacity: 0.25,
    rotate: 0,
    direction: 1,
    speed: 1,
    trail: 60,
    fps: 20,
    zIndex: 2e9,
    className: 'spinner',
    top: '50%',
    left: '50%',
    shadow: false,
    hwaccel: false,
    position: 'absolute'
};

let spinnerContainer = document.getElementById('spinner-container');
let spinner = new Spinner(spinnerConfig);

map.on('load', (e) => {
    const audioContext = new AudioContext();
    let descriptionContent = document.getElementById('description-content');
    let existingBufferSource;
    let selectedVoice = 'Random';
    let selectedSpeed = 1.0;

    const guiData = {
        playPause: true,
        fetchDescription: function () {
            fetchDescription()
        },
        requestAudio: true,
        voice: selectedVoice,
        speed: selectedSpeed,
        mapStyle: defaultStyle
    };

    const gui = new dat.GUI()
    let fetchDescriptionControl = gui.add(guiData, "fetchDescription").name("Fetch description");

    const audioControlsFolder = gui.addFolder('Audio Controls')
    let playPauseControl = audioControlsFolder.add(guiData, "playPause").name('Play/Pause');

    playPauseControl.onChange(function (value) {
        if (value) {
            audioContext.resume().then(() => {
            });
        } else {
            audioContext.suspend().then(() => {
            });
        }
    });
    audioControlsFolder.open()

    const audioOptionsFolder = gui.addFolder('Audio Options')
    const requestAudioControl = audioOptionsFolder.add(guiData, 'requestAudio').name('Request Audio');
    const voiceSelectControl = audioOptionsFolder.add(guiData, 'voice', ['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer', 'Random']).name('Voice');
    const speedSelectControl = audioOptionsFolder.add(guiData, 'speed', 0.25, 4.0, 0.01).name('Speech Speed')

    const mapOptionsFolder = gui.addFolder('Map Options')
    const mapStyleSelectControl = mapOptionsFolder.add(guiData, 'mapStyle', ['Streets', 'Outdoors', 'Light', 'Dark', 'Satellite', 'Satellite Streets', 'Navigation Day', 'Navigation Night']).name('Map Style');
    mapStyleSelectControl.onChange(function (value) {
        map.setStyle(mapStyles[value])
    })

    function fetchDescription() {
        const canvasDataURL = map.getCanvas().toDataURL('image/png');

        let payload = {
            data_url: canvasDataURL,
            speed: guiData.speed,
            voice: guiData.voice.toLowerCase(),
            response_type: guiData.requestAudio ? 'audio' : 'text',
            skip_openai: false
        };

        spinner.spin(spinnerContainer);

        fetch(proxyApiUrl + '/description',
            {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            })
            .then(response => response.json())
            .then(data => {
                spinner.stop();

                const textData = data.text_data;

                descriptionContent.innerHTML = `${textData.message}`;

                if (guiData.requestAudio) {
                    const audioDataBase64 = data.audio_data;
                    const audioDataBinary = atob(audioDataBase64);
                    const audioDataBuffer = new ArrayBuffer(audioDataBinary.length);
                    const audioDataView = new Uint8Array(audioDataBuffer);
                    for (let i = 0; i < audioDataBinary.length; i++) {
                        audioDataView[i] = audioDataBinary.charCodeAt(i);
                    }

                    return audioContext.decodeAudioData(audioDataBuffer);
                } else {
                    return null;
                }
            })
            .then(decodedAudio => {
                if (!decodedAudio) {
                    return;
                }

                const newBufferSource = audioContext.createBufferSource();
                newBufferSource.buffer = decodedAudio;
                if (existingBufferSource) {
                    existingBufferSource.stop();
                    existingBufferSource.disconnect();
                }

                newBufferSource.connect(audioContext.destination);
                newBufferSource.start(audioContext.currentTime);

                existingBufferSource = newBufferSource
            })
            .catch(error => {
                spinner.stop();
                console.error('Error:', error);
            });
    }
})