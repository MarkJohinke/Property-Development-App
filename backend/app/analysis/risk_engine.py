"""
Risk engine for computing overall development risk rating.
"""

from typing import Dict, Any


def compute_risk_rating(
    constraints: Dict[str, Any],
    constraint_severity: Dict[str, Any],
    slope_data: Dict[str, Any],
    geometry_data: Dict[str, Any]
) -> str:
    """
    Compute overall risk rating for development.
    
    Combines constraint severity with geometry factors to produce
    a traffic-light risk assessment: Low / Medium / High / Red-Flag
    
    Args:
        constraints: Constraint evaluation results
        constraint_severity: Computed constraint severity scores
        slope_data: Slope metrics
        geometry_data: Geometric properties
    
    Returns:
        Risk rating string
    """
    # Start with constraint score
    base_score = constraint_severity.get("total_score", 0)
    
    # Add geometry risk factors
    geometry_score = 0
    
    # Slope factors
    mean_gradient = slope_data.get("mean_gradient_percent", 0)
    if mean_gradient > 25:
        geometry_score += 3
    elif mean_gradient > 15:
        geometry_score += 2
    
    # Irregular lot shape
    regularity = geometry_data.get("regularity_index", 1.0)
    if regularity < 0.75:
        geometry_score += 1
    
    # Corner lot (can be positive or negative depending on context)
    # For simplicity, treat as neutral here
    
    # Total risk score
    total_score = base_score + geometry_score
    
    # Map score to rating
    if total_score == 0:
        rating = "None"
    elif total_score <= 3:
        rating = "Low"
    elif total_score <= 7:
        rating = "Medium"
    elif total_score <= 12:
        rating = "High"
    else:
        rating = "Red-Flag"
    
    return rating


def generate_feasibility_notes(
    zone_code: str,
    fsr: float,
    cdc_potential: Dict[str, Any],
    da_potential: Dict[str, Any],
    yield_data: Dict[str, Any],
    constraints: Dict[str, Any]
) -> str:
    """
    Generate comprehensive feasibility notes.
    
    Args:
        zone_code: LEP zone code
        fsr: Floor space ratio
        cdc_potential: CDC assessment
        da_potential: DA assessment
        yield_data: Yield assessment
        constraints: Constraints
    
    Returns:
        Human-readable feasibility notes
    """
    notes_parts = []
    
    # 1. Zoning and yield
    primary_typology = yield_data.get("primary_typology", "development")
    notes_parts.append(
        f"Viable {primary_typology.lower()} site under {zone_code} zoning with {fsr}:1 FSR."
    )
    
    # 2. CDC vs DA
    if cdc_potential.get("is_potentially_cdc_compliant"):
        notes_parts.append("CDC pathway potentially available.")
    else:
        blocking = cdc_potential.get("blocking_constraints", [])
        if blocking:
            main_blocker = blocking[0].split("(")[0].strip()  # Get first constraint
            notes_parts.append(f"CDC unlikely due to {main_blocker.lower()}.")
    
    # 3. DA feasibility
    if da_potential.get("is_likely_supportable"):
        studies = da_potential.get("recommended_studies", [])
        if studies:
            main_study = studies[0].replace("Assessment", "").replace("Report", "").strip()
            notes_parts.append(
                f"DA feasible with appropriate {main_study.lower()} and design controls."
            )
        else:
            notes_parts.append("DA pathway realistic with standard design controls.")
    else:
        notes_parts.append("DA challenging due to significant constraints.")
    
    return " ".join(notes_parts)
