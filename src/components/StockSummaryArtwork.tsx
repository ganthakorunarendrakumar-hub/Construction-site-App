import React from 'react';

export type StockSummaryKind = 'available' | 'received' | 'used' | 'damaged';
export type StockArtworkMaterial =
  | 'cement' | 'steel' | 'sand' | 'bricks' | 'aggregate'
  | 'pipes' | 'electrical' | 'paint' | 'tiles' | 'hardware' | 'carpentry' | 'adhesives' | 'roofing'
  | 'general' | 'equipment';

interface StockSummaryArtworkProps {
  material: StockArtworkMaterial;
  kind: StockSummaryKind;
  dark?: boolean;
}

const renderMaterial = (material: StockArtworkMaterial, kind: StockSummaryKind) => {
  if (kind === 'damaged') {
    switch (material) {
      case 'cement':
        return <g><path d="M52 43 62 39l24 7 5 18-18 3-22-9z" /><path d="m68 42-4 10 7 4-8 8m14-14 4 4-6 8" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M55 68q5-6 10 0t10 0" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'steel':
        return <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4"><path d="M43 62h18q12 0 12-12V40" /><path d="M52 69h17q12 0 12-12V49" /><path d="M64 75h14q10 0 10-10V57" /></g>;
      case 'sand':
        return <g><path d="M37 68q8-13 18-16 7-12 17-8 8-12 19-5 11 8 15 29z" /><path d="M44 66q8-4 14-2m9-10 5 2m12-7 4 3m9 8 5 1" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m82 48 5 5-6 5 6 5-7 6" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'bricks':
        return <g><path d="m45 55 15-7 14 7-3 14-15 5-14-7z" /><path d="m77 51 15-6 12 7-2 14-16 5-11-5z" /><path d="m60 39 14-6 13 7-1 10-12 4-13-5z" /><path d="m61 49 3 6-5 6 5 7" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'aggregate':
        return <g><path d="m42 66 4-11 9-4 7 5 1 10zm24 5 4-13 9-6 8 7-2 12zm20-1 5-10 10-2 6 8-3 7z" /><path d="m66 51 5-10 9-2 5 8m-27 6-5-9 6-8 8 4" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'pipes':
        return <g><path d="M43 46h34v10H43zm17 14h39v10H60zM77 46h21v10H77z" /><path d="M43 46v10m34-10v10m17 4v10m-34-10v10" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M47 50h26m-9 14h31" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'electrical':
        return <g><path d="M72 40h29v35H72z" /><path d="M78 47h17v21H78zM83 52h7m-7 6h7m-7 6h7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M72 55c-15 0-16 12-27 12m56-3c9 0 11 6 15 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="m42 63 5 4-5 4" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'paint':
        return <g><path d="M52 49h33l-3 24H55zM56 45h25v5H56z" /><path d="M68 45V36h21v7h-4m-9 8v12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><path d="M82 73q9-4 17 0M48 76h55" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'tiles':
        return <g><path d="m48 48 22-8 17 7-23 9zm19 10 22-8 17 7-23 9zm-18 4 22-8 17 7-23 9z" /><path d="m71 43-4 11m27 2-5 12m-19-5-5 10" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'hardware':
        return <g><path d="M68 40h9v22q0 9 10 9h12v8H85q-17 0-17-17z" /><path d="M63 38h19v6H63zm0 11h11m-11 6h11m-11 6h11" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="94" cy="75" r="5" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'carpentry':
        return <g><path d="m48 48 15-8 40 18-16 8zM48 61l15-8 40 18-16 8z" /><path d="m62 43 1 10m12-5 1 10m12-5 1 10m-25 3 1 10m12-5 1 10" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'adhesives':
        return <g><path d="m53 48 31-10 6 7-8 29-31-1z" /><path d="m56 48 25 1m-22 6 20 3m-22 3 18 4m14-19 13-5-2 8-11 4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M48 77h52" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'roofing':
        return <g><path d="m49 57 34-17 23 10-34 18z" /><path d="m53 66 33-17 20 9-33 17z" /><path d="m59 57 3 10m8-16 3 10m9-16 3 10m-16 18 3 9m8-15 3 9m8-15 3 9" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      default:
        return <g><path d="m52 49 35-4 7 22-17 7-26-8z" /><path d="m59 48 7 10 7-6 5 12 8-8" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M55 69h35" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    }
  }

  if (kind === 'used') {
    switch (material) {
      case 'cement':
        return <g><path d="M72 49h35v29H72zM68 45h43v5H68z" /><path d="M78 55h23M78 62h23M78 69h23" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M51 56h14l3 18H49zM53 51h10l2 5H51z" /><path d="M54 77h11" fill="none" stroke="currentColor" strokeWidth="3" /></g>;
      case 'steel':
        return <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3"><path d="M63 77V37m12 40V32m12 45V37m12 40V32" /><path d="M59 48h44M59 63h44" /><path d="M68 39h5m7-5h5m7 5h5" strokeWidth="1.5" /></g>;
      case 'sand':
        return <g><path d="M40 74q14-21 29-18 10-15 24-8 10 3 16 26z" /><path d="m58 52 7-13 4 13m13 4 7-17 5 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M43 76h63" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'bricks':
        return <g><path d="M67 35h40v43H67z" /><path d="M67 49h40M67 63h40M86 35v14m-10 0v14m20 0v15" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M48 68h13l2 10H46zM50 64h9l2 4H48z" /></g>;
      case 'aggregate':
        return <g><path d="M76 53h25v25H76z" /><path d="M76 59h25M82 53v6m9-6v6m-15 7h25m-18 0v6m9-6v6m-16 6h25" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m48 76 5-11 8-2 7 8-2 7zm10-20 5-8 7 4-1 9-8 2z" /></g>;
      case 'pipes':
        return <g><path d="M47 45h38v9H47zM71 54h9v16h-9zM82 61h19v9H82z" /><path d="M48 45v9m36-9v9m-4 0v9m-9 7v5m27-14v9" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'electrical':
        return <g><path d="M72 39h31v37H72z" /><path d="M79 47h17v21H79z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M83 53h9m-9 6h9m-9 6h9M72 58H58c-8 0-8 13-16 13m57-8c8 0 8 8 11 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></g>;
      case 'paint':
        return <g><path d="M54 55h30l-3 22H57zM58 50h22v5H58z" /><path d="M69 50v-9h26v8h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><path d="M48 78h53m-44-6h13" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'tiles':
        return <g><path d="M54 45h20v14H54zm23 0h20v14H77zM43 62h20v14H43zm23 0h20v14H66zM89 62h18v14H89z" /><path d="M54 45v14m23-14v14M43 62v14m23-14v14m23-14v14" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>;
      case 'hardware':
        return <g><path d="M57 47h9v24h-9zm19-7h9v31h-9zm19 12h9v19h-9z" /><path d="M53 46h17v5H53zm19-7h17v5H72zm0 11h17v5H72zm0 11h17v5H72zm0 10h17v5H72z" /><circle cx="60" cy="76" r="5" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'carpentry':
        return <g><path d="M56 38h42v40H56z" /><path d="M62 44h30v28H62zM77 44v28m-15-14h30" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="88" cy="59" r="1.8" /></g>;
      case 'adhesives':
        return <g><path d="M51 50h18v26H51zM73 43h18v33H73zM95 51h13v25H95z" /><path d="M54 45h12v5H54zm22-7h12v5H76zm3 24h6m-30 2h6" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'roofing':
        return <g><path d="m46 61 30-17q9-5 15 2l-4 5q-3-3-7-1L51 67z" /><path d="m60 71 30-17q9-5 15 2l-4 5q-3-3-7-1L65 77z" /><path d="M47 72h61" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
      case 'equipment':
        return <g><path d="M69 53h39v25H69zM79 47h19v6H79z" /><path d="M78 59v13m8-13v13m8-13v13" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m48 49 5-5 10 10-5 5zm9 9-10 13 5 5 13-10M50 78h28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>;
      default:
        return <g><path d="M70 48h35v30H70zM80 42h16v6H80z" /><path d="M77 57h21m-21 7h21" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m48 54 7-7 11 11-7 7z" /></g>;
    }
  }

  if (kind === 'received') {
    return <g>
      {material === 'sand' || material === 'aggregate'
        ? <path d="M43 47h42l8 25H44z" />
        : material === 'pipes'
          ? <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M40 39h46m-46 7h46m-46 7h46" /><path d="M41 37v12m45-12v12" strokeWidth="2" /></g>
          : material === 'electrical'
            ? <g><path d="M49 40h28v20H49z" /><circle cx="91" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M49 49h28m-21-9v20m8-20v20m-6 13c-8 0-9 7-15 7" fill="none" stroke="currentColor" strokeWidth="2" /></g>
            : material === 'paint'
              ? <g><path d="M46 44h20l-2 27H48zM69 39h20l-2 32H71zM92 47h15l-2 24H94z" /><path d="M49 40h14m9-5h14m8 8h12" fill="none" stroke="currentColor" strokeWidth="2" /></g>
              : material === 'tiles'
                ? <g><path d="m44 42 18-8 18 7-18 8zm23 11 18-8 18 7-18 8zm-23 9 18-8 18 7-18 8z" /></g>
                : material === 'hardware'
                  ? <g><path d="M48 39h12v29H48zm21 5h12v24H69zm21-7h12v31H90z" /><path d="M45 38h18v5H45zm21 5h18v5H66zm21-7h18v5H87z" /></g>
                  : material === 'carpentry'
                    ? <g><path d="M45 44h61v8H45zm0 13h61v8H45zm0 13h61v8H45z" /><path d="M53 45v7m18-7v7m17-7v7m-27 6v7m18-7v7m17-7v7" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>
                    : material === 'adhesives'
                      ? <g><path d="M48 43h18v27H48zm23-7h18v34H71zm23 9h15v25H94z" /><path d="M51 38h12v5H51zm23-7h12v5H74zm26 9 8-4v8l-8 4" fill="none" stroke="currentColor" strokeWidth="2" /></g>
                      : material === 'roofing'
                        ? <g><path d="m43 56 29-17 18 8-29 17zm18 12 29-17 18 8-29 17z" /><path d="m54 52 4 9m11-17 4 9m10-5 4 9m-20 7 4 9m11-17 4 9" fill="none" stroke="currentColor" strokeWidth="2" /></g>
        : material === 'steel'
          ? <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M40 39h43m-42 7h43m-43 7h43" /></g>
          : material === 'bricks'
            ? <g><path d="M47 35h16v9H47zm18 0h16v9H65zm-9 11h16v9H56zm18 0h16v9H74z" /></g>
            : material === 'cement'
              ? <g><path d="M50 36h16v12H50zm18 0h16v12H68zm-9 14h17v11H59z" /><path d="M54 39h8m10 0h8m-8 14h8" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>
              : <g><path d="M50 35h26v19H50zM57 30h12v5H57z" /><path d="m84 39 10 6-7 9-8-4z" /></g>}
      <path d="M34 56h56l15 10v13H34z" />
      <path d="M90 62h12l8 9H90z" />
      <circle cx="50" cy="79" r="6" /><circle cx="96" cy="79" r="6" />
      <path d="M36 69h14m49 0h8" fill="none" stroke="currentColor" strokeWidth="2" />
    </g>;
  }

  switch (material) {
    case 'cement':
      return <g><path d="M53 54h20l3 16H50zM56 49h14l3 5H53zM77 47h18l3 15H75zM79 42h13l3 5H77zM64 35h18l3 14H61zM67 30h12l3 5H64z" /><path d="M56 58h13m10-7h11m-21-12h11" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M43 73h58m-51 4v5m39-5v5m-29-5v5m19-5v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></g>;
    case 'steel':
      return <g><path d="M41 40h60v25H41z" opacity=".18" /><path d="M42 40v25m7-25v25m7-25v25m7-25v25m7-25v25m7-25v25m7-25v25m7-25v25m7-25v25" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /><path d="M41 45h60M41 59h60M46 69h50m-40 4v6m31-6v6" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'sand':
      return <g><path d="M38 70q9-15 19-15 8-15 20-11 12-10 22-3 9 8 12 29z" /><path d="M48 65q5-3 9-2m10-8 5 2m13-11 4 3m9 8 5 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="52" cy="49" r="1.5" /><circle cx="90" cy="47" r="1.5" /><circle cx="70" cy="39" r="1.5" /></g>;
    case 'bricks':
      return <g><path d="M47 60h21v11H47zm22 0h21v11H69zm22 0h14v11H91zM58 48h21v11H58zm22 0h21v11H80zM47 36h21v11H47zm22 0h21v11H69z" /><path d="M47 75h59m-51 3v5m43-5v5" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'aggregate':
      return <g><path d="m41 70 5-12 9-5 8 7-2 10zm18-2 5-14 10-5 8 9-3 11zm20 3 4-12 10-5 9 9-2 8zm-13-23 5-9 9 3 2 10-9 3zm-26-1 4-8 8 2 3 9-9 3z" /><path d="M42 75h61" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'pipes':
      return <g><path d="M44 42h55v9H44zm8 14h54v9H52zm-5 14h50v8H47z" /><path d="M44 42v9m55-9v9m-47 5v9m54-9v9m-59 5v8m50-8v8" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'electrical':
      return <g><circle cx="59" cy="56" r="16" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="59" cy="56" r="7" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M78 39h23v35H78z" /><path d="M84 46h11m-11 8h11m-11 8h11" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'paint':
      return <g><path d="M45 50h22l-3 26H48zM72 43h22l-3 33H75zM98 53h13l-2 23h-9z" /><path d="M48 45h16m11-7h16m8 10h12" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M48 56h16m11-5h16" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>;
    case 'tiles':
      return <g><path d="m46 52 18-8 18 7-18 8zm22 12 18-8 18 7-18 8zm-20 1 18-8 18 7-18 8z" /><path d="M48 79h57" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'hardware':
      return <g><path d="M50 43h10v26H50zm22-8h10v34H72zm22 12h10v22H94z" /><path d="M47 41h16v5H47zm22-8h16v5H69zm22 12h16v5H91z" /><circle cx="55" cy="74" r="5" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'carpentry':
      return <g><path d="M47 38h14v40H47zm21 6h14v34H68zm21-5h14v39H89z" /><path d="M44 37h20v5H44zm21 6h20v5H65zm22-5h20v5H87z" /></g>;
    case 'adhesives':
      return <g><path d="M48 45h18v29H48zM71 38h18v36H71zM94 49h15v25H94z" /><path d="M51 40h12v5H51zm23-7h12v5H74zm25 3 9-4v8l-9 4" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'roofing':
      return <g><path d="m43 56 30-17 18 9-30 17zm18 13 30-17 18 9-30 17z" /><path d="m54 52 4 9m11-17 4 9m10-5 4 9m-20 7 4 9m11-17 4 9" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
    case 'equipment':
      return <g><path d="M53 49h41v24H53zM63 42h21v7H63z" /><path d="M59 56h29m-29 7h20" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m42 54 7-7 15 15-7 7z" /><path d="m56 66-10 11m36-4h19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></g>;
    default:
      return <g><path d="M52 47h42v27H52zM62 40h22v7H62z" /><path d="M59 56h28m-28 8h28" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M44 55h5v18h-5z" /></g>;
  }
};

const renderSceneDetail = (kind: StockSummaryKind, frame: number) => {
  if (kind === 'available') {
    return frame === 1
      ? <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"><path d="M38 30h72M40 49h68M43 68h64M42 29v42m31-42v42m31-42v42" /><path d="M48 34h17m-17 19h17m-17 19h17" strokeWidth="1.5" /></g>
      : <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"><path d="m39 43 35-20 37 20M44 43v28m58-28v28M48 51h49m-49 15h49" /><path d="M42 76h66" strokeWidth="2.5" /></g>;
  }

  if (kind === 'received') {
    return frame === 1
      ? <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M96 42v12m-5-5 5 5 5-5M105 47v10m-4-4 4 4 4-4M42 82h65l-12-8" /><path d="M89 65h18" strokeWidth="3" /></g>
      : null;
  }

  if (kind === 'used') {
    return frame === 1
      ? <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"><path d="M42 77V35h18v42m-18-28h18m-18 15h18m-9-29v42M36 43h31M36 58h31" /><path d="M69 77V47m8 30V37m-8 10h8m-8 15h8" strokeWidth="1.5" /></g>
      : <g><circle cx="47" cy="39" r="7" /><path d="M39 50q8-8 16 0l5 22H35z" /><path d="m53 56 11-9 4 4-11 11m-17 13h19" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>;
  }

  return frame === 1
    ? <g><path d="m40 77 7-7 6 6m6 2 7-8 7 7m18-1 6-6 7 6" /><path d="m49 75 3-6 4 4m36 4 4-7 5 6" fill="none" stroke="currentColor" strokeWidth="2" /></g>
    : <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M45 33h59v42H45z" /><path d="m78 37-7 12 8 5-9 12 7 5" /><path d="M52 69h12m31-31v9" strokeWidth="1.5" /></g>;
};

const renderSceneFrame = (material: StockArtworkMaterial, kind: StockSummaryKind, frame: number) => {
  if (frame === 2 && kind === 'received') {
    return <g>
      <g transform="translate(4,-8) scale(.65)">{renderMaterial(material, 'available')}</g>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <path d="M31 54h36l9 10v12H31zM76 29v46m0-27h8m-8 10h8M28 76h82" />
        <path d="M40 76a6 6 0 1 0 12 0m15 0a6 6 0 1 0 12 0" />
        <path d="M31 60h17v14H31z" fill="currentColor" stroke="none" />
      </g>
    </g>;
  }

  return <g transform={frame === 2 ? 'translate(2,-1)' : undefined}>
    {kind === 'available' && <path d="M39 82h68" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    {kind === 'damaged' && <path d="M39 81h69" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    {renderMaterial(material, kind)}
    {frame > 0 && renderSceneDetail(kind, frame)}
  </g>;
};

export const StockSummaryArtwork: React.FC<StockSummaryArtworkProps> = ({ material, kind, dark = false }) => {
  const artworkRef = React.useRef<SVGSVGElement>(null);
  const [isInView, setIsInView] = React.useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = React.useState(() => !document.hidden);
  const shouldAnimate = isInView && isDocumentVisible;

  React.useEffect(() => {
    const artwork = artworkRef.current;
    if (!artwork) return undefined;

    const handleVisibilityChange = () => setIsDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { rootMargin: '72px' });
    observer?.observe(artwork);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer?.disconnect();
    };
  }, []);

  return (
    <svg
      ref={artworkRef}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 120 90"
      data-stock-material={material}
      data-stock-kind={kind}
      className="pointer-events-none absolute bottom-1 right-1 -z-10 h-[76px] w-[100px] select-none sm:h-[84px] sm:w-[112px]"
      style={{ color: dark ? '#BDEBF2' : '#087EA4', opacity: dark ? 0.17 : 0.085 }}
    >
      {[0, 1, 2].map(frame => (
        <g
          key={frame}
          className="bp-stock-art-frame"
          data-stock-art-index={frame}
          style={{ animationPlayState: shouldAnimate ? 'running' : 'paused' }}
        >
          {renderSceneFrame(material, kind, frame)}
        </g>
      ))}
    </svg>
  );
};
