"use strict";

(function registerSettings(globalScope) {
  const settings = {
    currency: "GHS",
    locale: "en-GH",
    timezone: "Africa/Accra",
    defaultRowsPerPage: 10,
    supportedExportTypes: ["csv", "excel", "pdf", "print"]
  };

  globalScope.TBRData = globalScope.TBRData || {};
  globalScope.TBRData.settings = settings;
})(window);
