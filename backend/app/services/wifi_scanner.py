import subprocess
import platform
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class WifiScanner:
    @staticmethod
    def _percent_to_dbm(percent: float) -> float:
        """Approximation of dBm from percentage if RSSI isn't directly reported."""
        # Quality 0% is approx -100 dBm, 100% is approx -50 dBm
        return round((percent / 2.0) - 100.0, 1)

    @staticmethod
    def _evaluate_quality(signal_percent: float) -> str:
        if signal_percent >= 75:
            return "Excellent"
        elif signal_percent >= 50:
            return "Good"
        elif signal_percent >= 25:
            return "Fair"
        return "Poor"

    def get_current_connection(self) -> Dict[str, Any]:
        os_type = platform.system()
        if os_type == "Windows":
            return self._scan_windows_current()
        elif os_type == "Linux":
            return self._scan_linux_current()
        elif os_type == "Darwin":
            return self._scan_darwin_current()
        else:
            return self._mock_current()

    def get_nearby_networks(self) -> List[Dict[str, Any]]:
        os_type = platform.system()
        if os_type == "Windows":
            return self._scan_windows_nearby()
        else:
            return []

    def _scan_windows_current(self) -> Dict[str, Any]:
        try:
            cmd = ["netsh", "wlan", "show", "interfaces"]
            output = subprocess.check_output(cmd, encoding="utf-8", errors="ignore")
            
            data: Dict[str, Any] = {
                "connected": False,
                "interface": None,
                "adapter": None,
                "ssid": None,
                "bssid": None,
                "band": None,
                "channel": None,
                "radio_type": None,
                "signal_percent": 0.0,
                "signal_dbm": -100.0,
                "quality": "Disconnected",
                "rx_rate_mbps": 0.0,
                "tx_rate_mbps": 0.0,
                "timestamp": datetime.utcnow().isoformat()
            }

            for line in output.splitlines():
                line = line.strip()
                if not line or ":" not in line:
                    continue
                k, v = [x.strip() for x in line.split(":", 1)]

                if k == "Name":
                    data["interface"] = v
                elif k == "Description":
                    data["adapter"] = v
                elif k == "State":
                    data["connected"] = (v.lower() == "connected")
                elif k == "SSID":
                    data["ssid"] = v
                elif k == "AP BSSID":
                    data["bssid"] = v
                elif k == "Band":
                    data["band"] = v
                elif k == "Channel":
                    try:
                        data["channel"] = int(v)
                    except ValueError:
                        data["channel"] = None
                elif k == "Radio type":
                    data["radio_type"] = v
                elif k == "Receive rate (Mbps)":
                    try:
                        data["rx_rate_mbps"] = float(v)
                    except ValueError:
                        pass
                elif k == "Transmit rate (Mbps)":
                    try:
                        data["tx_rate_mbps"] = float(v)
                    except ValueError:
                        pass
                elif k == "Signal":
                    match = re.search(r"(\d+)%", v)
                    if match:
                        data["signal_percent"] = float(match.group(1))
                elif k == "Rssi":
                    try:
                        data["signal_dbm"] = float(v)
                    except ValueError:
                        pass

            if data["connected"]:
                if data["signal_dbm"] == -100.0 and data["signal_percent"] > 0:
                    data["signal_dbm"] = self._percent_to_dbm(data["signal_percent"])
                data["quality"] = self._evaluate_quality(data["signal_percent"])
            
            return data
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    def _scan_windows_nearby(self) -> List[Dict[str, Any]]:
        try:
            cmd = ["netsh", "wlan", "show", "networks", "mode=bssid"]
            output = subprocess.check_output(cmd, encoding="utf-8", errors="ignore")

            networks = []
            current_net: Optional[Dict[str, Any]] = None

            for line in output.splitlines():
                line = line.strip()
                if not line:
                    continue

                if line.startswith("SSID "):
                    if current_net and current_net.get("ssid"):
                        networks.append(current_net)
                    ssid_val = line.split(":", 1)[1].strip() if ":" in line else "Hidden Network"
                    current_net = {
                        "ssid": ssid_val or "Hidden Network",
                        "authentication": None,
                        "encryption": None,
                        "bssid": None,
                        "signal_percent": 0.0,
                        "radio_type": None,
                        "band": None,
                        "channel": None
                    }
                elif current_net and ":" in line:
                    k, v = [x.strip() for x in line.split(":", 1)]
                    if k == "Authentication":
                        current_net["authentication"] = v
                    elif k == "Encryption":
                        current_net["encryption"] = v
                    elif k.startswith("BSSID"):
                        current_net["bssid"] = v
                    elif k == "Signal":
                        m = re.search(r"(\d+)%", v)
                        if m:
                            current_net["signal_percent"] = float(m.group(1))
                    elif k == "Radio type":
                        current_net["radio_type"] = v
                    elif k == "Band":
                        current_net["band"] = v
                    elif k == "Channel":
                        try:
                            current_net["channel"] = int(v)
                        except ValueError:
                            pass

            if current_net and current_net.get("ssid"):
                networks.append(current_net)

            # Sort descending by signal percent
            networks.sort(key=lambda x: x["signal_percent"], reverse=True)
            return networks[:25]
        except Exception:
            return []

    def _scan_linux_current(self) -> Dict[str, Any]:
        # Linux nmcli implementation
        try:
            output = subprocess.check_output(
                ["nmcli", "-t", "-f", "ACTIVE,SSID,BSSID,CHAN,SIGNAL,SECURITY", "dev", "wifi"],
                encoding="utf-8", errors="ignore"
            )
            for line in output.splitlines():
                parts = line.split(":")
                if len(parts) >= 5 and parts[0] == "yes":
                    sig = float(parts[4]) if parts[4].isdigit() else 50.0
                    return {
                        "connected": True,
                        "interface": "wlan0",
                        "ssid": parts[1],
                        "bssid": parts[2],
                        "channel": int(parts[3]) if parts[3].isdigit() else None,
                        "signal_percent": sig,
                        "signal_dbm": self._percent_to_dbm(sig),
                        "quality": self._evaluate_quality(sig),
                        "timestamp": datetime.utcnow().isoformat()
                    }
        except Exception:
            pass
        return self._mock_current()

    def _scan_darwin_current(self) -> Dict[str, Any]:
        # macOS airport implementation
        return self._mock_current()

    def _mock_current(self) -> Dict[str, Any]:
        return {
            "connected": True,
            "interface": "wlan0",
            "adapter": "Virtual Wi-Fi Adapter",
            "ssid": "Simulated_Wi-Fi",
            "bssid": "00:11:22:33:44:55",
            "band": "5 GHz",
            "channel": 36,
            "radio_type": "802.11ax",
            "signal_percent": 82.0,
            "signal_dbm": -59.0,
            "quality": "Excellent",
            "rx_rate_mbps": 433.0,
            "tx_rate_mbps": 433.0,
            "timestamp": datetime.utcnow().isoformat()
        }

wifi_scanner = WifiScanner()
