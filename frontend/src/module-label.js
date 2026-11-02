export const moduleLabel = (module) =>
  module.curriculum_catalog
    ? `${module.module_name} · Year ${module.study_year}`
    : module.module_name;
