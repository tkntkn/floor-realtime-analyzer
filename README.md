# floor-realtime-analyzer

## usage
open [https://sensorium-pj.github.io/floor-realtime-analyzer/](https://sensorium-pj.github.io/floor-realtime-analyzer/)
That's it.

## pipeline
(`websocket`) ----> `floor-realtime-analyzer` ----> .zip(.webm+.json)

##  considerations
- .json -> .json + .dat
- .webm -> .mp4 ( ok for being converted in the external apps)
- `wss` for inter-host communication?

## future
- inter-host communication
- seeing floor image in realtime from your smartphone, if the server connected to the floor hardware has global IP



v2022-09-21
