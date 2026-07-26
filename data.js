/*
 * Default hardware catalog for the configurator.
 *
 * Every item shares a common shape:
 *   id          - unique string id
 *   name        - human readable name
 *   vendor      - manufacturer / seller name
 *   vendorUrl   - optional direct link (falls back to a search link if empty)
 *   partNumber  - manufacturer or distributor part number (optional)
 *   price       - optional unit price in USD (number)
 *   notes       - optional free-text note shown in the BOM
 *   imageUrl    - optional direct product image (falls back to an image search)
 *   modelUrl    - optional 3D/CAD model link (falls back to a GrabCAD search)
 *   datasheetUrl - optional datasheet link (falls back to a web search)
 *   distQuery   - optional search term for DigiKey/Mouser/Newark stock links
 *                 (falls back to the part number, then the name)
 *
 * Category-specific fields:
 *   computers:
 *     supportsInternalModem - can an internal mPCIe/M.2 LTE modem be fitted?
 *     internalModemFormFactor - e.g. "mPCIe" / "M.2" (informational)
 *     supportsSdCard         - is an SD card storage slot available?
 *     requiresSdCard         - must an SD card be fitted (auto-selected, storage step required)?
 *   internalModems:
 *     formFactor  - e.g. "mPCIe"
 *     antennaCount - number of RF ports that need an antenna bulkhead cable
 *   accessories:
 *     autoWith    - array of tags that auto-add this accessory (e.g. "internal-modem")
 */

window.DEFAULT_CATALOG = {
  computers: [
    {
      id: "adv-epc-r3720",
      name: "Advantech EPC-R3720 (Rear I/O: GPIO, RS-485, 2nd CAN)",
      vendor: "Advantech",
      vendorUrl: "https://www.advantech.com/en-us/products/880a61e5-3fed-41f3-bf53-8be2410c0f19/epc-r3720/mod_fde326be-b36e-4044-ba9a-28c4c49a25c6",
      partNumber: "EPC-R3720",
      price: null,
      imageUrl: "https://advdownload.advantech.com/productfile/PIS/EPC-R3720/Product%20-%20Photo(Main)-50/EPC-R3720_3D--_Banner2023020216170220230912174847.jpg",
      images: [
        "https://advdownload.advantech.com/productfile/PIS/EPC-R3720/Product%20-%20Photo(Main)-50/EPC-R3720_3D--_Banner2023020216170220230912174847.jpg",
        "https://advdownload.advantech.com/productfile/PIS/EPC-R3720/Product%20-%20Photo(B)/EPC-R3720_Front--_Banner20210804131446.jpg"
      ],
      modelUrl: "models/advantech-epc-r3720/EPC-R3720.step",
      distQuery: "EPC-R3720",
      datasheetUrl: "datasheets/advantech-epc-r3720/EPC-R3720.pdf",
      supportsInternalModem: true,
      internalModemFormFactor: "mPCIe",
      supportsSdCard: true,
      requiresSdCard: true,
      forceModemType: "internal",
      notes: "Rear I/O variant with GPIO, RS-485 and a second CAN port."
    },
    {
      id: "revpi-connect-5",
      name: "Revolution Pi Connect 5 (2x CAN, 8 GB RAM)",
      vendor: "Kunbus / Revolution Pi",
      vendorUrl: "https://revolutionpi.com/shop/en/revpi-connect-5",
      partNumber: "RevPi Connect 5 8GB",
      price: null,
      imageUrl: "https://revolutionpi.com/shop/media/catalog/product/cache/332d2a2dded0683112bbb062b4d56370/r/e/revpi-connect-5.webp",
      images: [
        "https://revolutionpi.com/shop/media/catalog/product/cache/332d2a2dded0683112bbb062b4d56370/r/e/revpi-connect-5.webp",
        "https://revolutionpi.com/shop/media/catalog/product/cache/332d2a2dded0683112bbb062b4d56370/r/e/revpi-connect-5-front.png"
      ],
      modelUrl: "models/revpi-connect-5/revpi-connect-5.stp",
      datasheetUrl: "datasheets/revpi-connect-5/revpi-connect-5.pdf",
      distQuery: "RevPi Connect 5",
      supportsInternalModem: false,
      internalModemFormFactor: "",
      supportsSdCard: false,
      forceModemType: "external",
      notes: "2x CAN ports, 8 GB RAM. Use an external modem (no internal mPCIe modem slot)."
    },
    {
      id: "seeed-recomputer-r2045-12",
      name: "Seeed Studio reComputer Industrial R2045-12",
      vendor: "Seeed Studio",
      vendorUrl: "https://www.seeedstudio.com/reComputer-Industrial-R2045-12-p-6544.html",
      partNumber: "R2045-12",
      price: null,
      imageUrl: "https://media-cdn.seeedstudio.com/media/catalog/product/cache/bb49d3ec4ee05b6f018e93f896b8a25d/7/-/7-recomputer-industrail-r2000_2_3.jpg",
      images: [
        "https://media-cdn.seeedstudio.com/media/catalog/product/cache/bb49d3ec4ee05b6f018e93f896b8a25d/7/-/7-recomputer-industrail-r2000_2_3.jpg",
        "https://media-cdn.seeedstudio.com/media/catalog/product/cache/bb49d3ec4ee05b6f018e93f896b8a25d/1/0/10-recomputer-industrail-r2000_2_3.jpg"
      ],
      modelUrl: "models/seeed-r2045/seeed-r2045.stp",
      datasheetUrl: "datasheets/seeed-r2045/seeed-r2045.pdf",
      distQuery: "reComputer R2045-12",
      supportsInternalModem: true,
      internalModemFormFactor: "mPCIe",
      supportsSdCard: true,
      requiresSdCard: true,
      notes: "Industrial edge computer."
    }
  ],

  internalModems: [
    {
      id: "waveshare-eg25-g-mpcie",
      name: "Waveshare Quectel EG25-G mPCIe (LTE Cat 4)",
      vendor: "Waveshare",
      vendorUrl: "https://www.waveshare.com/search?keyword=EG25-G",
      partNumber: "EG25-G mPCIe",
      price: null,
      imageUrl: "https://m.media-amazon.com/images/I/61i0IYgbkRL._AC_SL1500_.jpg",
      modelUrl: "",
      distQuery: "EG25-G",
      formFactor: "mPCIe",
      antennaCount: 2,
      notes: "LTE Cat 4, global bands, built-in GNSS. Antennas: LTE + GPS."
    },
    {
      id: "quectel-ec25-afxga-mpcie",
      name: "Quectel EC25-AFXGA mini-PCIe (LTE Cat 4, North America)",
      vendor: "Quectel",
      vendorUrl: "https://www.quectel.com/product/lte-ec25-mini-pcie-series",
      partNumber: "EC25-AFXGA-MINIPCIE",
      price: null,
      imageUrl: "https://www.ycict.net/wp-content/uploads/2023/09/Quectel-EC25-AFXD-Mini-PCIe-Module-quectel-module-ycict.jpg",
      images: [
        "https://www.ycict.net/wp-content/uploads/2023/09/Quectel-EC25-AFXD-Mini-PCIe-Module-quectel-module-ycict.jpg",
        "https://www.ycict.net/wp-content/uploads/2023/09/Quectel-EC25-AFXD-Mini-PCIe-Module-ycict-2.jpg"
      ],
      modelUrl: "",
      distQuery: "EC25-AFXGA",
      formFactor: "mPCIe",
      antennaCount: 2,
      notes: "LTE Cat 4, 2G/3G/4G, built-in multi-GNSS, North American operators. Antennas: LTE + GPS."
    }
  ],

  externalModems: [
    {
      id: "sierra-rv50x-1103052",
      name: "Sierra Wireless AirLink RV50X (1103052)",
      vendor: "Sierra Wireless (DigiKey)",
      vendorUrl: "https://www.digikey.com/en/products/result?keywords=1719-1003-ND",
      partNumber: "RV50X_1103052 / DigiKey 1719-1003-ND",
      price: null,
      imageUrl: "https://mm.digikey.com/Volume0/opasdata/d220001/medias/images/2182/MFG_RV50X_1103052.jpg?hidebanner=true",
      images: [
        "https://mm.digikey.com/Volume0/opasdata/d220001/medias/images/2182/MFG_RV50X_1103052.jpg?hidebanner=true",
        "https://www.sierrawireless.com/wp-content/uploads/2022/02/2_RV50_550x550.png"
      ],
      modelUrl: "models/sierra-rv50/rv50.stp",
      distQuery: "RV50X",
      datasheetUrl: "https://www.sierrawireless.com/wp-content/uploads/2026/04/RV50X-Datasheet-March2026.pdf",
      notes: "Rugged industrial LTE HSPA+ router/gateway with Ethernet."
    },
    {
      id: "digi-ix20-w0g4f",
      name: "Digi IX20 (IX20-W0G4F)",
      vendor: "Digi International",
      vendorUrl: "https://www.digi.com/products/networking/cellular-routers/industrial/digi-ix20",
      partNumber: "IX20-W0G4F",
      price: null,
      imageUrl: "https://www.digi.com/products/assets/digi-ix20/digi-ix20",
      images: [
        "https://www.digi.com/products/assets/digi-ix20/digi-ix20",
        "https://www.digi.com/products/assets/digi-ix20/digi-ix20-front"
      ],
      modelUrl: "models/digi-ix20/ix20.step",
      datasheetUrl: "datasheets/digi-ix20/ix20.pdf",
      distQuery: "IX20-W0G4F",
      notes: "Compact industrial LTE cellular router with Ethernet."
    }
  ],

  antennas: [
    {
      id: "teltonika-pr1kcs28",
      name: "Teltonika Combo SISO Mobile/GNSS/Wi-Fi Roof SMA Antenna (PR1KCS28)",
      vendor: "Teltonika Networks",
      vendorUrl: "https://www.teltonika-networks.com/products/accessories/antenna-options/combo-siso-mobilegnsswi-fi-roof-sma-antenna",
      partNumber: "PR1KCS28",
      price: null,
      imageUrl: "images/teltonika-pr1kcs28/PR1KCS28.png",
      modelUrl: "models/teltonika-pr1kcs28/PR1KCS28.step",
      datasheetUrl: "datasheets/teltonika-pr1kcs28/PR1KCS28.pdf",
      distQuery: "PR1KCS28",
      notes: "Combo SISO Mobile/GNSS/Wi-Fi roof-mount SMA antenna for cellular modems / routers."
    }
  ],

  routers: [],

  storage: [
    {
      id: "sd-industrial-128gb",
      name: "Industrial microSD Card 128 GB",
      vendor: "Generic Industrial",
      vendorUrl: "",
      partNumber: "",
      price: null,
      imageUrl: "https://m.media-amazon.com/images/I/71ojeUPQI9L._AC_SY355_.jpg",
      modelUrl: "",
      notes: "Industrial-grade microSD for use in computers with an SD slot."
    }
  ],

  accessories: [
    {
      id: "antenna-bulkhead-cable",
      name: "Antenna Bulkhead Pigtail Cable (u.FL/IPEX to SMA)",
      vendor: "Generic",
      vendorUrl: "",
      partNumber: "",
      price: null,
      imageUrl: "",
      modelUrl: "",
      autoWith: ["internal-modem"],
      notes: "Required to route each internal-modem RF port to a chassis bulkhead antenna connector."
    }
  ]
};
