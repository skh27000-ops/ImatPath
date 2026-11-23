/* Biology, organised like the official IMAT syllabus (MUR, DM 1005/2026, Annex A).
   Shared by lessons.html, checklist.html and question-bank.html.
   Big titles hold small titles. Question Bank sets keep their ids and saved answers. */
(function () {
  var TOPICS = [
    { t: 'The cell as the basis of life', items: ['Cell theory and cell size', 'Prokaryotic and eukaryotic cells (animal and plant)', 'Viruses', 'Cell membrane structure, function and transport', 'Cellular structures and their functions', 'Cell cycle and division: mitosis and meiosis', 'Chromosomes and chromosome maps'] },
    { t: 'The chemistry of living things', items: ['Biological importance of weak interactions', 'Organic molecules and their functions', 'The role of enzymes'] },
    { t: 'Bioenergetics', items: ['ATP', 'Redox reactions in living things', 'Photosynthesis', 'Glycolysis, aerobic respiration and fermentation'] },
    { t: 'Reproduction and inheritance', items: ['Life cycles, sexual and asexual reproduction', 'Mendel’s laws and their applications', 'Chromosomal theory of inheritance and inheritance patterns', 'DNA structure and replication', 'The genetic code and protein synthesis', 'Prokaryotic DNA and eukaryotic chromosome structure', 'Genes and regulation of gene expression', 'Human genetics: mono- and multifactorial transmission', 'Hereditary diseases (autosomal and X-linked)', 'Biotechnology: recombinant DNA and its applications'] },
    { t: 'Inheritance and environment', items: ['Mutations', 'Natural and artificial selection', 'Evolutionary theories and the genetic basis of evolution'] },
    { t: 'Anatomy and physiology of animals and humans', items: ['Animal tissues', 'Human systems and their interactions', 'Homeostasis'] }
  ];
  var LESSONS = TOPICS.reduce(function (a, g) { return a.concat(g.items); }, []);

  /* Question sets, in the order used by BIO_QMAP (biology-question-map.js).
     Each official small title has its own set. Human systems is split by body system. */
  function slug(s) { return 'bio-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  var LESSON_SETS = [
    'Biological importance of weak interactions', 'Organic molecules and their functions', 'The role of enzymes',
    'Cell theory and cell size', 'Prokaryotic and eukaryotic cells (animal and plant)', 'Viruses', 'Cell membrane structure, function and transport', 'Cellular structures and their functions', 'Cell cycle and division: mitosis and meiosis', 'Chromosomes and chromosome maps',
    'ATP', 'Redox reactions in living things', 'Photosynthesis', 'Glycolysis, aerobic respiration and fermentation',
    'Life cycles, sexual and asexual reproduction', 'Mendel\u2019s laws and their applications', 'Chromosomal theory of inheritance and inheritance patterns', 'DNA structure and replication', 'The genetic code and protein synthesis', 'Prokaryotic DNA and eukaryotic chromosome structure', 'Genes and regulation of gene expression', 'Human genetics: mono- and multifactorial transmission', 'Hereditary diseases (autosomal and X-linked)', 'Biotechnology: recombinant DNA and its applications',
    'Mutations', 'Natural and artificial selection', 'Evolutionary theories and the genetic basis of evolution',
    'Animal tissues'
  ];
  var SYSTEMS = ['Circulatory', 'Respiratory', 'Digestive & excretory', 'Nervous & endocrine', 'Immune', 'Musculoskeletal', 'Reproductive', 'Sense organs', 'Embryo development'];
  var HUMAN = 'Human systems and their interactions';
  var SETS = LESSON_SETS.map(function (n) { return { id: slug(n), name: n, lesson: n }; })
    .concat(SYSTEMS.map(function (n) { return { id: slug('human ' + n), name: 'Human systems: ' + n, lesson: HUMAN }; }))
    .concat([{ id: slug('Homeostasis'), name: 'Homeostasis', lesson: 'Homeostasis' }])
    .concat(['Plant biology', 'Ecology & environment', 'General biology'].map(function (n) { return { id: slug(n), name: n, lesson: null }; }));

  /* Question Bank big titles: the 6 official ones, then sets not named in the official list. */
  var QB_GROUPS = TOPICS.map(function (g) {
    return { t: g.t, ids: SETS.filter(function (s) { return s.lesson && g.items.indexOf(s.lesson) >= 0; }).map(function (s) { return s.id; }) };
  }).concat([{ t: 'Extra practice', note: 'Not named in the official biology list', ids: SETS.filter(function (s) { return !s.lesson; }).map(function (s) { return s.id; }) }]);

  /* The 24 question sets used before the sort: saved "practiced" marks on them still count. */
  var OLD_SETS = {
    'chemistry-of-living-things': ['Biological importance of weak interactions', 'Organic molecules and their functions'],
    'enzymes-metabolism': ['The role of enzymes'],
    'cell-structure-organelles': ['Cell theory and cell size', 'Prokaryotic and eukaryotic cells (animal and plant)', 'Cellular structures and their functions'],
    'cell-membrane-transport': ['Cell membrane structure, function and transport'],
    'cell-division-mitosis-meiosis': ['Cell cycle and division: mitosis and meiosis', 'Chromosomes and chromosome maps'],
    'cellular-respiration-glycolysis-krebs': ['ATP', 'Redox reactions in living things', 'Glycolysis, aerobic respiration and fermentation'],
    'photosynthesis': ['Photosynthesis'],
    'molecular-genetics-dna-rna': ['DNA structure and replication', 'The genetic code and protein synthesis', 'Prokaryotic DNA and eukaryotic chromosome structure', 'Genes and regulation of gene expression'],
    'mendelian-genetics-inheritance': ['Mendel\u2019s laws and their applications', 'Chromosomal theory of inheritance and inheritance patterns', 'Human genetics: mono- and multifactorial transmission', 'Hereditary diseases (autosomal and X-linked)'],
    'biotechnology-viruses': ['Viruses', 'Biotechnology: recombinant DNA and its applications'],
    'evolution-population-genetics': ['Mutations', 'Natural and artificial selection', 'Evolutionary theories and the genetic basis of evolution'],
    'animal-tissues-histology': ['Animal tissues'],
    'human-physiology-reproductive': ['Life cycles, sexual and asexual reproduction']
  };

  /* Question set -> checklist lessons it marks as practiced */
  var QB_TO_LESSONS = {};
  Object.keys(OLD_SETS).forEach(function (id) { QB_TO_LESSONS[id] = OLD_SETS[id]; });
  SETS.forEach(function (s) { if (s.lesson) QB_TO_LESSONS[s.id] = [s.lesson]; });

  /* Checklist lesson -> its question set. Human systems has several, so its link opens the anatomy group. */
  var QB = {};
  SETS.forEach(function (s) { if (s.lesson && s.lesson !== HUMAN) QB[s.lesson] = s.id; });

  /* Rebuilds biology into the sorted sets. Question order stays the same, so saved answers
     (stored by position, also in the cloud) keep pointing at the right question. */
  function buildChapters(questions) {
    var map = window.BIO_QMAP;
    if (!map || map.length !== questions.length) return null;
    return SETS.map(function (s, si) {
      var idx = [];
      map.forEach(function (m, i) { if (m === si) idx.push(i); });
      return { id: s.id, name: s.name, idx: idx, questions: idx.map(function (i) { return questions[i]; }), startIndex: idx[0], endIndex: idx[idx.length - 1] };
    }).filter(function (c) { return c.idx.length; });
  }

  /* The 28 old checklist chapters, in saved order, and where their progress goes. */
  var OLD = [
    ['Cell theory and cell size', 'Prokaryotic and eukaryotic cells (animal and plant)', 'Cellular structures and their functions'],
    ['Cell membrane structure, function and transport'],
    ['Cell cycle and division: mitosis and meiosis', 'Chromosomes and chromosome maps'],
    ['DNA structure and replication', 'Prokaryotic DNA and eukaryotic chromosome structure'],
    ['Genes and regulation of gene expression'],
    ['The genetic code and protein synthesis'],
    ['Mendel’s laws and their applications', 'Chromosomal theory of inheritance and inheritance patterns'],
    ['Human genetics: mono- and multifactorial transmission', 'Hereditary diseases (autosomal and X-linked)'],
    ['Biotechnology: recombinant DNA and its applications'],
    ['Mutations', 'Natural and artificial selection', 'Evolutionary theories and the genetic basis of evolution'],
    [], [], [],                 /* classification, biodiversity, plant tissues */
    ['Animal tissues'],
    [], [], [], [], [], [],     /* circulatory to endocrine: handled below */
    ['Life cycles, sexual and asexual reproduction'],
    [],                         /* immunology */
    ['The role of enzymes'],
    ['ATP', 'Glycolysis, aerobic respiration and fermentation'],
    ['Photosynthesis'],
    ['Viruses'],
    ['Organic molecules and their functions'],
    ['Organic molecules and their functions']
  ];

  /* Moves saved 28-chapter biology progress to the new lessons, once. Keeps a copy of the old array. */
  function migrateFrom28() {
    try {
      var state = JSON.parse(localStorage.getItem('ip_chap') || '{}');
      var old = state && state.Biology;
      if (!Array.isArray(old) || old.length !== OLD.length) return;
      var next = LESSONS.map(function () { return 0; });
      OLD.forEach(function (names, i) {
        names.forEach(function (n) { next[LESSONS.indexOf(n)] |= old[i] & 3; });
      });
      /* Human systems counts only if all six old system chapters had that status */
      next[LESSONS.indexOf('Human systems and their interactions')] = old.slice(14, 20).reduce(function (a, v) { return a & v; }, 3);
      localStorage.setItem('ip_chap_bio_old', JSON.stringify(old));
      state.Biology = next;
      localStorage.setItem('ip_chap', JSON.stringify(state));
      localStorage.setItem('ip_bio_order', '2'); /* next was built in the current order */
    } catch (e) {}
  }

  /* "The cell as the basis of life" became big title 1 (it was 2). Saved progress is stored by lesson
     position, so the 10 first positions (3 chemistry + 7 cell) are rotated once: cell first, chemistry after. */
  function migrateOrder() {
    try {
      if (localStorage.getItem('ip_bio_order') === '2') return;
      var state = JSON.parse(localStorage.getItem('ip_chap') || '{}');
      var cur = state && state.Biology;
      if (Array.isArray(cur) && cur.length === LESSONS.length) {
        localStorage.setItem('ip_chap_bio_before_order', JSON.stringify(cur));
        state.Biology = cur.slice(3, 10).concat(cur.slice(0, 3), cur.slice(10));
        localStorage.setItem('ip_chap', JSON.stringify(state));
      }
      localStorage.setItem('ip_bio_order', '2');
    } catch (e) {}
  }

  function migrateStored() { migrateFrom28(); migrateOrder(); }

  function groupOfChapter(id) {
    for (var i = 0; i < QB_GROUPS.length; i++) if (QB_GROUPS[i].ids.indexOf(id) >= 0) return i;
    return null;
  }

  window.BIO = { TOPICS: TOPICS, LESSONS: LESSONS, SETS: SETS, QB: QB, QB_TO_LESSONS: QB_TO_LESSONS, QB_GROUPS: QB_GROUPS, OLD_SETS: OLD_SETS, ANATOMY_GROUP: 5, buildChapters: buildChapters, migrateStored: migrateStored, groupOfChapter: groupOfChapter };
})();
